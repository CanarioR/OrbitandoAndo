# 🛰️ Orbitando Ando

Minijuego arcade pixel-art de un solo botón hecho con HTML5 Canvas.

Guía un satélite entre planetas usando la gravedad. Toca la pantalla para soltarte de la órbita y vuela hacia el siguiente planeta. ¡Cuidado con perderte en el espacio!

## 🕹️ Jugar

👉 **[¡Jugar ahora!](https://canarior.github.io/OrbitandoAndo/)** — funciona en móvil y escritorio.

## 🎮 Cómo jugar

1. Toca o haz clic para desbloquear el audio.
2. El satélite orbita automáticamente — **toca / clic** para lanzarte.
3. Alcanza el siguiente planeta para capturarlo y sumar órbitas.
4. Si te alejas demasiado… ¡te pierdes en el espacio!

## 🗂️ Estructura

```
miniGameSatelite/
├── index.html          # Punto de entrada
├── css/
│   └── style.css       # Estilos del canvas pixel-art
├── js/
│   ├── audio.js        # Sistema de audio (SFX + música en loop)
│   ├── render.js       # Paleta, fuente bitmap, primitivas y dibujo
│   ├── game.js         # Estados, física orbital, intro y lógica
│   └── main.js         # Bucle principal del juego
└── audio/
    ├── bg_music.wav     # Música de fondo (loop)
    ├── llegada.mp3      # Llegada en la intro
    ├── contacto.mp3     # Captura de planeta
    ├── explosion.mp3    # Explosión al morir
    ├── transicion.mp3   # Transición iris
    └── game_over.wav    # Game over
```

## 🎨 Estética

- Resolución lógica de **180×320** (formato 9:16 vertical).
- Paleta de **10 colores** en tonos teal/aqua.
- Fuente bitmap personalizada de **5×5 píxeles**.
- Primitivas dibujadas solo con `fillRect` (sin anti-aliasing).

## 🛠️ Tecnologías

- HTML5 Canvas 2D
- JavaScript vanilla (sin dependencias)
- CSS con `image-rendering: pixelated`

## 👤 Autor

**Canario**
