OVERLAY ASIGNADOR DE DIOSES

1. Abre este archivo:
   iniciar-overlay.cmd

2. En el navegador/OBS/TikTok Studio usa:
   http://localhost:3041

3. En Interactive, en el evento que quieras usar, pon un WebHook:
   http://localhost:3041/follow?name={nickname}&avatar={imgprofile}

Tambien acepta:
   http://localhost:3041/likes?name={nickname}&avatar={imgprofile}
   http://localhost:3041/webhook?name={nickname}&avatar={imgprofile}

Si usas POST body:
   {"name":"{nickname}","avatar":"{imgprofile}"}

El fondo es verde puro para croma key.
