"use strict";

const CACHE_NAME = "coda-estudos-v10-9-4-pages-login";
const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css?v=10.9.3",
  "./public-api.js?v=10.9.4-pages-login",
  "./platform.js?v=10.2.1",
  "./admin.js?v=10.5.0.3",
  "./lesson-content.js?v=10.2.1",
  "./script.js?v=10.5.4",
  "./styles/legacy.css", "./styles/base.css", "./styles/responsive.css",
  "./themes/light.css?v=10.5.0.7", "./themes/dark.css",
  "./components/login.css?v=10.5.0.7", "./components/orbitals.css", "./components/cards.css", "./components/three-d-programmer.css?v=10.5.0.3", "./components/circuit-simulator.css?v=10.9.3",
  "./pages/student.css", "./pages/teacher.css", "./pages/admin.css?v=10.5.0.2",
  "./js/login.js?v=10.5.0", "./js/pdf-reports.js?v=10.5.0", "./js/lessons.js?v=10.5.0",
  "./js/laboratory.js?v=10.5.0", "./js/esp32.js?v=10.5.2", "./js/esp32-circuit-logic.js?v=10.5.4", "./js/tutor.js?v=10.5.0",
  "./js/institution.js?v=10.5.0", "./js/core.js?v=10.5.4",
  "./dados.json",
  "./banco.json",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
