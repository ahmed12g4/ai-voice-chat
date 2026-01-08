/* eslint-disable no-undef */
// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:3000",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "", // إزالة /api من المسار عند التوجيه
      },
    })
  );
};
