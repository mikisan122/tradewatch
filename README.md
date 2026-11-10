# TRADEWATCH — Teléfono + Smartwatch (React Native + Expo)

Son dos interfaces nativas que se ejecutan en **dos emuladores separados**:

| Emulador | Qué muestra |
| --- | --- |
| 📱 Teléfono Android (`Pixel_8_API_35`) | App **TradeWatch**: inicio, mercado, compra/venta, portafolio, billetera, historial, perfil (el reloj no aparece aquí) |
| ⌚ Reloj Wear OS (`CurioWatch_Demo`, redondo) | **Smartwatch Virtual**: hora y fecha, saldo, ganancias y pérdidas, rendimiento, favoritas y alertas |

Las dos interfaces están hechas con componentes de React Native, sin HTML ni WebView. Están en un solo proyecto Expo: al iniciar, la app detecta si corre en un reloj y abre la interfaz que corresponde.

## Precios reales

Los precios vienen de la API pública de **Yahoo Finance** (gratuita, no requiere clave). El servidor (`server/market.js`) consulta cada 20 segundos: precio actual, cierre anterior, apertura, máximo y mínimo del día, volumen, rango de 52 semanas, gráfica del día (cada 5 min) e histórico de 3 meses. La app y el reloj leen esos datos desde el servidor. Fuera del horario de mercado (Nueva York, 9:30–16:00) se muestra el último precio de cierre.

El saldo con el que operas es de práctica: cada cuenta nueva empieza con $25,000.

## Cuentas de usuario y base de datos

- **Registro e inicio de sesión** en el teléfono: nombre, usuario, correo y contraseña.
- **Base de datos SQLite** (`server/tradewatch.db`), incluida en Node.js 22, así que no hay que instalar nada. Guarda las cuentas (contraseñas cifradas con *scrypt*), las sesiones y los datos de cada usuario: saldo, acciones, historial, favoritas y alertas.
- **En el reloj** inicias sesión con el **mismo usuario y contraseña**. El servidor solo envía al reloj los datos de esa cuenta. La pantalla **Cuenta** del reloj muestra tu nombre y @usuario.
- Puedes cerrar sesión en el teléfono (Perfil → Cerrar sesión) o en el reloj (pantalla Cuenta). Los datos quedan guardados en tu cuenta.

## Cómo ejecutarlo

1. En Android Studio → Device Manager, inicia **los dos emuladores**: el teléfono y el reloj Wear OS.
2. En una terminal, inicia el servidor de sincronización:
   ```bash
   npm run sync
   ```
3. En otra terminal, inicia Expo:
   ```bash
   npx expo start
   ```
4. En una tercera terminal, abre la app en los dos emuladores:
   ```bash
   npm run devices
   ```

El teléfono abre TradeWatch y el reloj abre el Smartwatch Virtual. Crea tu cuenta en el teléfono y luego inicia sesión en el reloj con el mismo usuario.

### Por qué hace falta `npm run sync`

Los dos emuladores son dispositivos distintos y no comparten memoria. El teléfono envía su estado a un pequeño servidor WebSocket local (`server/sync-server.js`, puerto 8090) y el servidor se lo reenvía al reloj. No usa Bluetooth.

Wear OS apaga la red del reloj cuando está inactivo. Por eso el servidor crea túneles `adb reverse` y el reloj se conecta por `localhost`. Además, si el reloj deja de recibir datos durante 10 segundos, se reconecta solo.

**Windows:** si `npx expo start --android` dice que no encuentra el SDK, revisa que `ANDROID_HOME` apunte a `...\AppData\Local\Android\Sdk`.

## Smartwatch Virtual (en el emulador Wear OS)

| Control táctil | Acción |
| --- | --- |
| Deslizar ← → | Cambiar de pantalla |
| Botones ‹ › en los bordes | Pantalla anterior / siguiente |
| Puntos inferiores | Ir directo a una pantalla |
| Tocar una favorita o una alerta | Abrir su detalle |
| Botón **ATRÁS** o el botón Atrás del reloj | Volver |
| Mantener presionado en Inicio | Apagar · tocar la pantalla apagada para encender |

**Pantallas:** Inicio (hora, fecha, saldo total, ganancia del día) · Rendimiento (ganancia/pérdida total y %) · Favoritas (precio y variación ▲▼) · Alertas (notificaciones bursátiles y resumen del día).

**Sincronización:** si compras o vendes en el teléfono, el reloj vibra, muestra el aviso y actualiza los totales. Los precios reales se actualizan cada 20 segundos y el reloj los refleja. Cada alerta nueva aparece como aviso emergente en el reloj. El reloj es solo de consulta: no compra, no vende y no retira dinero.

## Estructura

```
index.js                  Elige la interfaz: teléfono o reloj
server/
  sync-server.js          API de cuentas + base de datos SQLite + sincronización + túneles adb
  open-devices.js         Abre la app en todos los emuladores
src/
  PhoneApp.js             Raíz de la app del teléfono (Expo Router)
  app/                    Rutas del teléfono
  screens/                Pantallas del teléfono
  components/             Componentes reutilizables
  auth/                   Inicio de sesión, registro y sesión (teléfono y reloj)
  core/                   Estado de la app: simulación, alertas; se guarda en la cuenta
  sync/                   Enlace teléfono ↔ reloj (WebSocket, snapshot, detección del reloj)
  watch/WatchApp.js       Raíz de la app del reloj
  smartwatch/             Módulo SmartwatchVirtual: esfera, pantallas y gestos
```
