const express = require("express");
const { getRouter } = require("stremio-addon-sdk");
const builder = require("../lib/addon");

const app = express();

const MAINTENANCE_STREAM = JSON.stringify({
  streams: [{
    name: "🚧 ADDON DISABLED",
    description: "AnimeFillerChecker addon is currently disabled indefinitely.\nThere were too many requests coming in and my Vercel deployment can't provide it anymore. Until I find a sustainable hosting solution, the Stremio addon will stay offline.\nThe browser extension at animefillerchecker.com still works for filler info, visit the site for updates.\nIn the meantime you can still host the stremio addon on your local device on your own if you want.\n\nhttps://github.com/nehirakbass/anime-filler-checker",
    externalUrl: "https://github.com/nehirakbass/anime-filler-checker",
  }],
});
const MAINTENANCE_SUBTITLES = JSON.stringify({ subtitles: [] });

// Add CORS headers explicitly
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Middleware for caching and maintenance mode
app.use((req, res, next) => {
  const reqPath = req.url || "";
  if (builder.MAINTENANCE_MODE && /\/(stream|subtitles)\//.test(reqPath)) {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=3600");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(reqPath.includes("/subtitles/") ? MAINTENANCE_SUBTITLES : MAINTENANCE_STREAM);
  }
  
  if (reqPath.includes("/manifest.json")) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  } else if (/\/(stream|subtitles)\//.test(reqPath)) {
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  }
  next();
});

// Attach the Stremio Addon SDK Express router
const addonInterface = builder.getInterface();
const addonRouter = getRouter(addonInterface);

// Use the addon router at the root level of the app
app.use("/", addonRouter);

// For Vercel Serverless Function, export the Express app
module.exports = app;
