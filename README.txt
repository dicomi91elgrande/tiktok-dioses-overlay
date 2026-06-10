OVERLAY ASIGNADOR DRAGON BALL Z

1. Abre este archivo:
   iniciar-overlay.cmd

2. En el navegador/OBS/TikTok Studio usa:
   http://localhost:3041

   En Render/TikTok Studio usa:
   https://tiktok-dioses-overlay.onrender.com

3. En Interactive, en el evento que quieras usar, pon un WebHook:
   http://localhost:3041/follow?name={nickname}&avatar={imgprofile}

   En Render usa:
   https://tiktok-dioses-overlay.onrender.com/follow

Tambien acepta:
   http://localhost:3041/likes?name={nickname}&avatar={imgprofile}
   http://localhost:3041/webhook?name={nickname}&avatar={imgprofile}

Si usas POST body:
   {"name":"{nickname}","avatar":"{imgprofile}"}

El fondo es transparente por defecto.
Si necesitas croma verde, usa:
   http://localhost:3041?bg=green
   https://tiktok-dioses-overlay.onrender.com?bg=green
