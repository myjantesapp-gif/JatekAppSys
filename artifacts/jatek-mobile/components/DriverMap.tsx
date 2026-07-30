/**
 * DriverMap — displays driver position + delivery destination on a live map.
 *
 * Uses Google Maps JavaScript API when EXPO_PUBLIC_GOOGLE_MAPS_KEY is set,
 * otherwise falls back to Leaflet + OpenStreetMap. Works on web (iframe) and
 * native (react-native-webview) without a custom dev client.
 *
 * Features:
 * - Animated scooter driver marker
 * - Restaurant marker (optional)
 * - Customer destination pin
 * - Google Directions API route polyline (or straight-line fallback)
 * - Smooth driver position interpolation between GPS pings (1.5 s animation)
 */
import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  driverLat: number;
  driverLng: number;
  destLat?: number;
  destLng?: number;
  restaurantLat?: number;
  restaurantLng?: number;
  height?: number;
  pinColor?: string;
  driverColor?: string;
}

const GOOGLE_KEY = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "").trim();

function buildGoogleHtml(
  driverLat: number,
  driverLng: number,
  destLat: number | undefined,
  destLng: number | undefined,
  restaurantLat: number | undefined,
  restaurantLng: number | undefined,
  pin: string,
  driver: string,
) {
  const hasDest = destLat != null && destLng != null;
  const hasRestaurant = restaurantLat != null && restaurantLng != null;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>
  html,body,#m{height:100%;margin:0;padding:0;background:#eef;font-family:-apple-system,BlinkMacSystemFont,sans-serif}
</style>
</head>
<body>
<div id="m"></div>
<script>
  function initMap(){
    var driverPos={lat:${driverLat},lng:${driverLng}};
    var destPos=${hasDest ? `{lat:${destLat},lng:${destLng}}` : "null"};
    var restaurantPos=${hasRestaurant ? `{lat:${restaurantLat},lng:${restaurantLng}}` : "null"};

    var map=new google.maps.Map(document.getElementById('m'),{
      center:driverPos,zoom:14,disableDefaultUI:true,gestureHandling:'greedy',
      clickableIcons:false,
      styles:[{featureType:'transit',stylers:[{visibility:'off'}]}],
    });

    /* ── Driver marker (scooter SVG) ── */
    var driverSvg='<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">'+
      '<circle cx="22" cy="22" r="19" fill="${driver}" stroke="#fff" stroke-width="3" filter="url(#s)"/>'+
      '<path d="M14 26h5l2-6 6 0 2 6h5l-3-8-3 0-1-4-6 0-1 4-3 0z" fill="#fff"/>'+
      '<circle cx="16" cy="30" r="3" fill="#fff"/><circle cx="28" cy="30" r="3" fill="#fff"/>'+
      '</svg>';
    var driverMarker=new google.maps.Marker({
      position:driverPos,map:map,zIndex:100,
      icon:{url:'data:image/svg+xml;utf-8,'+encodeURIComponent(driverSvg),
        scaledSize:new google.maps.Size(44,44),anchor:new google.maps.Point(22,22)},
      title:'Driver'
    });

    /* ── Destination pin ── */
    if(destPos){
      var pinSvg='<svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">'+
        '<path d="M19 2C9.6 2 2 9.6 2 19c0 13 17 29 17 29s17-16 17-29C36 9.6 28.4 2 19 2z" fill="${pin}" stroke="#fff" stroke-width="2"/>'+
        '<circle cx="19" cy="19" r="6" fill="#fff"/></svg>';
      new google.maps.Marker({
        position:destPos,map:map,zIndex:50,
        icon:{url:'data:image/svg+xml;utf-8,'+encodeURIComponent(pinSvg),
          scaledSize:new google.maps.Size(38,50),anchor:new google.maps.Point(19,48)},
        title:'Delivery'
      });
    }

    /* ── Restaurant marker ── */
    if(restaurantPos){
      var restSvg='<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">'+
        '<path d="M17 1C8.2 1 1 8.2 1 17c0 11.3 16 26 16 26s16-14.7 16-26C33 8.2 25.8 1 17 1z" fill="#FF8C00" stroke="#fff" stroke-width="2"/>'+
        '<text x="17" y="22" text-anchor="middle" font-size="14" fill="#fff">🍽</text></svg>';
      new google.maps.Marker({
        position:restaurantPos,map:map,zIndex:40,
        icon:{url:'data:image/svg+xml;utf-8,'+encodeURIComponent(restSvg),
          scaledSize:new google.maps.Size(34,44),anchor:new google.maps.Point(17,42)},
        title:'Restaurant'
      });
    }

    /* ── Fit bounds ── */
    function fitBounds(){
      var b=new google.maps.LatLngBounds();
      b.extend(driverPos);
      if(destPos) b.extend(destPos);
      if(restaurantPos) b.extend(restaurantPos);
      map.fitBounds(b,{top:70,right:60,bottom:60,left:60});
    }
    if(destPos || restaurantPos) fitBounds();

    /* ── Directions / route polyline ── */
    var directionsService=null;
    var directionsRenderer=null;
    var fallbackPoly=null;

    function drawFallbackPolyline(from,to){
      if(fallbackPoly) fallbackPoly.setMap(null);
      fallbackPoly=new google.maps.Polyline({
        path:[from,to],geodesic:true,strokeColor:'${pin}',
        strokeOpacity:0.7,strokeWeight:4,
        icons:[{icon:{path:'M 0,-1 0,1',strokeOpacity:1,scale:3},offset:'0',repeat:'14px'}],
      });
      fallbackPoly.setMap(map);
    }

    function updateRoute(fromLat,fromLng){
      if(!destPos) return;
      var from={lat:fromLat,lng:fromLng};
      if(!directionsService){
        directionsService=new google.maps.DirectionsService();
        directionsRenderer=new google.maps.DirectionsRenderer({
          suppressMarkers:true,
          polylineOptions:{strokeColor:'${pin}',strokeWeight:5,strokeOpacity:0.85}
        });
        directionsRenderer.setMap(map);
      }
      directionsService.route({
        origin:from,
        destination:destPos,
        travelMode:google.maps.TravelMode.DRIVING
      },function(result,status){
        if(status==='OK'){
          if(fallbackPoly){fallbackPoly.setMap(null);fallbackPoly=null;}
          directionsRenderer.setDirections(result);
          var leg=result.routes[0].legs[0];
          try{
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type:'route_info',
              etaMin:Math.round(leg.duration.value/60),
              distanceKm:Math.round(leg.distance.value/100)/10
            }));
          }catch(e){}
        } else {
          drawFallbackPolyline(from,destPos);
        }
      });
    }

    if(destPos) updateRoute(driverPos.lat,driverPos.lng);

    /* ── Smooth driver animation ── */
    var animStart=null,animDuration=1400;
    var animFromLat=driverPos.lat,animFromLng=driverPos.lng;
    var animToLat=driverPos.lat,animToLng=driverPos.lng;
    var animRafId=null;

    function easeOut(t){return 1-Math.pow(1-t,3);}

    function animateStep(ts){
      if(animStart===null) animStart=ts;
      var progress=easeOut(Math.min(1,(ts-animStart)/animDuration));
      var lat=animFromLat+(animToLat-animFromLat)*progress;
      var lng=animFromLng+(animToLng-animFromLng)*progress;
      driverMarker.setPosition({lat:lat,lng:lng});
      if(progress<1){
        animRafId=requestAnimationFrame(animateStep);
      } else {
        animRafId=null;
        updateRoute(animToLat,animToLng);
      }
    }

    window.updateDriverPosition=function(lat,lng){
      if(animRafId){cancelAnimationFrame(animRafId);animRafId=null;}
      var cur=driverMarker.getPosition();
      animFromLat=cur?cur.lat():lat;
      animFromLng=cur?cur.lng():lng;
      animToLat=lat; animToLng=lng;
      animStart=null;
      animRafId=requestAnimationFrame(animateStep);
    };

    function applyMsg(raw){
      try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){window.updateDriverPosition(d.lat,d.lng);}}catch(e){}
    }
    document.addEventListener('message',function(ev){applyMsg(ev.data);});
    window.addEventListener('message',function(ev){applyMsg(ev.data);});
  }
  window.initMap=initMap;
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=initMap&v=quarterly"></script>
</body>
</html>`;
}

function buildLeafletHtml(
  driverLat: number,
  driverLng: number,
  destLat: number | undefined,
  destLng: number | undefined,
  restaurantLat: number | undefined,
  restaurantLng: number | undefined,
  pin: string,
  driver: string,
) {
  const hasRestaurant = restaurantLat != null && restaurantLng != null;
  const destCode =
    destLat != null && destLng != null
      ? `
    var destIcon = L.divIcon({
      html: '<div style="background:${pin};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>',
      className: '', iconAnchor: [15, 30]
    });
    L.marker([${destLat}, ${destLng}], {icon: destIcon}).addTo(map);
    var bounds = L.latLngBounds([[${driverLat},${driverLng}],[${destLat},${destLng}]]);
    ${hasRestaurant ? `bounds.extend([${restaurantLat},${restaurantLng}]);` : ""}
    map.fitBounds(bounds, {padding: [40, 40]});
    L.polyline([[${driverLat},${driverLng}],[${destLat},${destLng}]],{color:'${pin}',weight:4,opacity:0.7,dashArray:'8,8'}).addTo(map);
  `
      : `map.setView([${driverLat}, ${driverLng}], 15);`;

  const restaurantCode = hasRestaurant
    ? `
    var restIcon = L.divIcon({
      html: '<div style="background:#FF8C00;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;">🍽</div>',
      className:'',iconAnchor:[16,16]
    });
    L.marker([${restaurantLat}, ${restaurantLng}], {icon: restIcon}).addTo(map);
  `
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

  var driverIcon=L.divIcon({
    html:'<div style="background:${driver};width:38px;height:38px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;">🛵</div>',
    className:'',iconAnchor:[19,19]
  });
  var driverMarker=L.marker([${driverLat},${driverLng}],{icon:driverIcon,zIndexOffset:100}).addTo(map);
  ${destCode}
  ${restaurantCode}

  /* Smooth animation between pings */
  var animFrame=null;
  function animateTo(fromLat,fromLng,toLat,toLng,duration){
    if(animFrame){cancelAnimationFrame(animFrame);animFrame=null;}
    var start=null;
    function step(ts){
      if(!start) start=ts;
      var p=Math.min(1,(ts-start)/duration);
      var ease=1-Math.pow(1-p,3);
      driverMarker.setLatLng([fromLat+(toLat-fromLat)*ease,fromLng+(toLng-fromLng)*ease]);
      if(p<1){animFrame=requestAnimationFrame(step);}
      else{animFrame=null;}
    }
    animFrame=requestAnimationFrame(step);
  }

  window.updateDriverPosition=function(lat,lng){
    var cur=driverMarker.getLatLng();
    animateTo(cur.lat,cur.lng,lat,lng,1400);
    map.panTo([lat,lng],{animate:true,duration:0.8});
  };
  function handleMsg(raw){try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){window.updateDriverPosition(d.lat,d.lng);}}catch(e){}}
  window.addEventListener('message',function(ev){handleMsg(ev.data);});
  document.addEventListener('message',function(ev){handleMsg(ev.data);});
  setTimeout(function(){map.invalidateSize();},150);
  setTimeout(function(){map.invalidateSize();},600);
</script>
</body>
</html>`;
}

export function DriverMap({
  driverLat,
  driverLng,
  destLat,
  destLng,
  restaurantLat,
  restaurantLng,
  height = 220,
  pinColor = "#E91E8C",
  driverColor = "#00C2C7",
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const initialHtml = React.useMemo(
    () =>
      GOOGLE_KEY
        ? buildGoogleHtml(driverLat, driverLng, destLat, destLng, restaurantLat, restaurantLng, pinColor, driverColor)
        : buildLeafletHtml(driverLat, driverLng, destLat, destLng, restaurantLat, restaurantLng, pinColor, driverColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destLat, destLng, restaurantLat, restaurantLng],
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.updateDriverPosition && window.updateDriverPosition(${driverLat}, ${driverLng}); true;`,
    );
  }, [driverLat, driverLng]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ lat: driverLat, lng: driverLng }), "*");
    } catch {
    }
  }, [driverLat, driverLng]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          ref={iframeRef as any}
          srcDoc={initialHtml}
          style={{ border: 0, width: "100%", height: "100%", display: "block", background: "#eef" }}
          title="Live driver location"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        style={styles.map}
        scrollEnabled={false}
        originWhitelist={["*"]}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", borderRadius: 14, overflow: "hidden" },
  map: { flex: 1 },
});
