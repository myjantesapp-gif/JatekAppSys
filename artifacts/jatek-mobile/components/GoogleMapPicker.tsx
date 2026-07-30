import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { OUJDA_CENTER, MAX_RADIUS_KM } from "@/utils/deliveryZone";

interface Props {
  latitude?: number;
  longitude?: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number | string;
  pinColor?: string;
  zoneColor?: string;
}

const GOOGLE_KEY = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "").trim();

function buildGoogleHtml(lat: number, lng: number, pin: string, zone: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>
  html,body,#m{height:100%;margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
  .center-pin{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);
    pointer-events:none;z-index:600;
  }
  .center-pin svg{filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))}
  .pin-shadow{
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    width:18px;height:6px;border-radius:50%;
    background:rgba(0,0,0,.25);
    pointer-events:none;z-index:599;
  }
</style>
</head>
<body>
<div id="m"></div>
<div class="pin-shadow"></div>
<div class="center-pin">
  <svg width="42" height="56" viewBox="0 0 42 56" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 2C10.5 2 2 10.5 2 21c0 14 19 33 19 33s19-19 19-33C40 10.5 31.5 2 21 2z" fill="${pin}"/>
    <circle cx="21" cy="21" r="7" fill="#fff"/>
  </svg>
</div>
<script>
  function send(payload){
    try{
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(payload));}
      else if(window.parent){window.parent.postMessage(JSON.stringify(payload),'*');}
    }catch(e){}
  }
  var googleReady=false;
  var fallbackUsed=false;
  var debounceTimer=null;

  function emitCenterGoogle(map){
    if(debounceTimer)clearTimeout(debounceTimer);
    debounceTimer=setTimeout(function(){
      var c=map.getCenter();
      send({lat:c.lat(),lng:c.lng()});
    },200);
  }
  function initMap(){
    if(fallbackUsed||googleReady)return;
    try{
      googleReady=true;
      var center={lat:${lat},lng:${lng}};
      var map=new google.maps.Map(document.getElementById('m'),{
        center:center,zoom:15,disableDefaultUI:true,
        gestureHandling:'greedy',clickableIcons:false,
      });
      window.__map=map;
      new google.maps.Circle({
        map:map,center:{lat:${OUJDA_CENTER.latitude},lng:${OUJDA_CENTER.longitude}},
        radius:${MAX_RADIUS_KM * 1000},
        strokeColor:'${zone}',strokeOpacity:0.6,strokeWeight:1.2,
        fillColor:'${zone}',fillOpacity:0.07,clickable:false,
      });
      map.addListener('center_changed',function(){emitCenterGoogle(map);});
      map.addListener('idle',function(){emitCenterGoogle(map);});
      function applyMsg(raw){
        try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){map.panTo({lat:d.lat,lng:d.lng});}}catch(e){}
      }
      document.addEventListener('message',function(ev){applyMsg(ev.data);});
      window.addEventListener('message',function(ev){applyMsg(ev.data);});
      send({ready:true,provider:'google'});
    }catch(e){ loadLeafletFallback(); }
  }
  window.initMap=initMap;

  function loadLeafletFallback(){
    if(fallbackUsed)return; fallbackUsed=true;
    var el=document.getElementById('m'); if(el){el.innerHTML='';}
    var css=document.createElement('link'); css.rel='stylesheet';
    css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    var s=document.createElement('script');
    s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=function(){
      try{
        var center=[${lat},${lng}];
        var map=L.map('m',{zoomControl:false,attributionControl:false}).setView(center,15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);
        L.circle([${OUJDA_CENTER.latitude},${OUJDA_CENTER.longitude}],{radius:${MAX_RADIUS_KM * 1000},color:'${zone}',weight:1.2,fillColor:'${zone}',fillOpacity:0.07}).addTo(map);
        var t=null;
        map.on('move',function(){
          if(t)clearTimeout(t);
          t=setTimeout(function(){var c=map.getCenter();send({lat:c.lat,lng:c.lng});},200);
        });
        function applyMsg(raw){
          try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){map.panTo([d.lat,d.lng]);}}catch(e){}
        }
        document.addEventListener('message',function(ev){applyMsg(ev.data);});
        window.addEventListener('message',function(ev){applyMsg(ev.data);});
        setTimeout(function(){map.invalidateSize();},150);
        setTimeout(function(){map.invalidateSize();},600);
        send({ready:true,provider:'leaflet-fallback'});
      }catch(e){ send({error:'leaflet-init-failed'}); }
    };
    s.onerror=function(){ send({error:'leaflet-load-failed'}); };
    document.body.appendChild(s);
  }

  // Google Maps reports auth failures via this global
  window.gm_authFailure=function(){ loadLeafletFallback(); };

  // Watchdog: if Google Maps script doesn't init in 5s, fall back
  setTimeout(function(){ if(!googleReady) loadLeafletFallback(); },5000);
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=initMap&v=quarterly" onerror="loadLeafletFallback()"></script>
</body>
</html>`;
}

function buildLeafletHtml(lat: number, lng: number, pin: string, zone: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body,#m{height:100%;margin:0;padding:0;background:#fff}
  .center-pin{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);
    pointer-events:none;z-index:600;
  }
  .pin-shadow{
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    width:18px;height:6px;border-radius:50%;
    background:rgba(0,0,0,.25);pointer-events:none;z-index:599;
  }
</style>
</head>
<body>
<div id="m"></div>
<div class="pin-shadow"></div>
<div class="center-pin">
  <svg width="42" height="56" viewBox="0 0 42 56" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 2C10.5 2 2 10.5 2 21c0 14 19 33 19 33s19-19 19-33C40 10.5 31.5 2 21 2z" fill="${pin}"/>
    <circle cx="21" cy="21" r="7" fill="#fff"/>
  </svg>
</div>
<script>
  function send(payload){
    try{
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(payload));}
      else if(window.parent){window.parent.postMessage(JSON.stringify(payload),'*');}
    }catch(e){}
  }
  function showMapError(){
    document.getElementById('m').innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;padding:24px;box-sizing:border-box;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E91E8C" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg><p style="margin:0;font-size:14px;color:#666;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">Carte temporairement indisponible.<br/>Confirmez votre position manuellement.</p></div>';
    send({error:'map-unavailable'});
  }
  function boot(){
    if(typeof L === 'undefined'){ showMapError(); return; }
    var center=[${lat},${lng}];
    var map=L.map('m',{zoomControl:false,attributionControl:false}).setView(center,15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);
    L.circle([${OUJDA_CENTER.latitude},${OUJDA_CENTER.longitude}],{radius:${MAX_RADIUS_KM * 1000},color:'${zone}',weight:1.2,fillColor:'${zone}',fillOpacity:0.07}).addTo(map);
    var t=null;
    map.on('move',function(){
      if(t)clearTimeout(t);
      t=setTimeout(function(){var c=map.getCenter();send({lat:c.lat,lng:c.lng});},200);
    });
    function applyMsg(raw){
      try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){map.panTo([d.lat,d.lng]);}}catch(e){}
    }
    document.addEventListener('message',function(ev){applyMsg(ev.data);});
    window.addEventListener('message',function(ev){applyMsg(ev.data);});
    setTimeout(function(){map.invalidateSize();},150);
    setTimeout(function(){map.invalidateSize();},600);
    send({ready:true});
  }
</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onload="boot()" onerror="showMapError()"></script>
</body>
</html>`;
}

export function GoogleMapPicker({
  latitude,
  longitude,
  onChange,
  height = 320,
  pinColor = "#E91E8C",
  zoneColor = "#00C2C7",
}: Props) {
  const lat = latitude ?? OUJDA_CENTER.latitude;
  const lng = longitude ?? OUJDA_CENTER.longitude;
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const html = useMemo(
    () =>
      GOOGLE_KEY
        ? buildGoogleHtml(lat, lng, pinColor, zoneColor)
        : buildLeafletHtml(lat, lng, pinColor, zoneColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          onChange({ latitude: data.lat, longitude: data.lng });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onChange]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (latitude == null || longitude == null) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ lat: latitude, lng: longitude }), "*");
    } catch {
      /* ignore */
    }
  }, [latitude, longitude]);

  // Sync prop changes to the native WebView via injectJavaScript
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (latitude == null || longitude == null) return;
    const js = `try{
      var pos={lat:${latitude},lng:${longitude}};
      if(window.__map&&window.__map.panTo){window.__map.panTo(pos);}
      else if(typeof map!=='undefined'&&map&&map.panTo){map.panTo([pos.lat,pos.lng]);}
    }catch(e){}true;`;
    webRef.current?.injectJavaScript(js);
  }, [latitude, longitude]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height: height as any }]}>
        <iframe
          ref={iframeRef as any}
          srcDoc={html}
          style={{
            border: "0",
            width: "100%",
            height: "100%",
            display: "block",
            background: "#fff",
          }}
          title="Carte de livraison"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height: height as any }]}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (typeof d.lat === "number" && typeof d.lng === "number") {
              onChange({ latitude: d.lat, longitude: d.lng });
            }
          } catch {
            /* ignore */
          }
        }}
        injectedJavaScript={
          latitude != null && longitude != null
            ? `try{(window.map||map).panTo&&(window.map||map).panTo({lat:${lat},lng:${lng}});}catch(e){}true;`
            : "true;"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", overflow: "hidden", backgroundColor: "#fff" },
  web: { flex: 1, backgroundColor: "transparent" },
});
