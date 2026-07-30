import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { OUJDA_CENTER, MAX_RADIUS_KM } from "@/utils/deliveryZone";

interface Props {
  latitude?: number;
  longitude?: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const PINK = "#E91E63";

function buildHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;padding:0;background:#eef}</style>
</head>
<body>
<div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function send(payload){
    try{
      if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify(payload));}
      else if(window.parent){window.parent.postMessage(JSON.stringify(payload),'*');}
    }catch(e){}
  }
  function boot(){
    if(typeof L === 'undefined'){ setTimeout(boot, 80); return; }
    var center=[${lat},${lng}];
    var oujda=[${OUJDA_CENTER.latitude},${OUJDA_CENTER.longitude}];
    var map=L.map('m',{zoomControl:true,attributionControl:false}).setView(center,14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

    L.circle(oujda,{radius:${MAX_RADIUS_KM * 1000},color:'${PINK}',weight:1.5,fillColor:'${PINK}',fillOpacity:0.07}).addTo(map);
    var marker=L.marker(center,{draggable:true}).addTo(map);
    marker.on('dragend',function(e){send({lat:e.target.getLatLng().lat,lng:e.target.getLatLng().lng});});
    map.on('click',function(e){marker.setLatLng(e.latlng);send({lat:e.latlng.lat,lng:e.latlng.lng});});

    function applyMsg(raw){
      try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){marker.setLatLng([d.lat,d.lng]);map.setView([d.lat,d.lng],map.getZoom());}}catch(e){}
    }
    document.addEventListener('message',function(ev){applyMsg(ev.data);});
    window.addEventListener('message',function(ev){applyMsg(ev.data);});

    // Fix grey-tile bug when container resizes
    setTimeout(function(){map.invalidateSize();},150);
    setTimeout(function(){map.invalidateSize();},600);
    send({ready:true});
  }
  boot();
</script>
</body>
</html>`;
}

export function LocationMapPicker({ latitude, longitude, onChange, height = 220 }: Props) {
  const lat = latitude ?? OUJDA_CENTER.latitude;
  const lng = longitude ?? OUJDA_CENTER.longitude;
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Build the HTML once with initial coordinates
  const html = useMemo(
    () => buildHtml(lat, lng),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ─── WEB platform ── use a real <iframe srcDoc> because react-native-webview
  // is a no-op on web and would otherwise render an empty grey box.
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

  // Recenter when parent props change (e.g. GPS pick) on WEB.
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

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height }]}>
        {/* iframe is a valid web-only DOM element */}
        <iframe
          ref={iframeRef as any}
          srcDoc={html}
          style={{
            border: "0",
            width: "100%",
            height: "100%",
            display: "block",
            background: "#eef",
          }}
          title="Carte de livraison"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
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
        // Smoothly recenter the marker when parent props change (e.g. GPS pick)
        injectedJavaScript={
          latitude != null && longitude != null
            ? `try{marker.setLatLng([${lat},${lng}]);map.setView([${lat},${lng}],map.getZoom());}catch(e){}true;`
            : "true;"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#eef",
    ...(Platform.OS === "android" ? { elevation: 1 } : {}),
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
