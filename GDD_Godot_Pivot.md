# Дизайн-документ: Космический Хоррор (Пивот на Godot 4)

## 1. Выбор движка и Архитектура

### Обоснование выбора: Godot 4 vs Ren'Py
Для проекта, объединяющего Artifact-подобный бой на 3 линиях, глобальную карту в стиле Slay the Spire и элементы визуальной новеллы, **Godot 4 (GDScript)** является безальтернативным выбором.
* **Почему не Ren'Py:** Ren'Py идеален для линейных/ветвящихся историй. Но реализация сложного drag-and-drop интерфейса, трех независимых игровых столов со своими пулами маны и физикой карт, а также процедурной генерации графа карты заставит нас постоянно бороться с ограничениями движка (основанного на Pygame).
* **Почему Godot 4:** Мощная система UI-узлов (`Control`, `Container`), гибкость в создании собственных архитектур (сцены внутри сцен), встроенная поддержка шейдеров и 2D-скелетных анимаций (полезно для эффектов Культа). Элементы визуальной новеллы в Godot легко реализуются кастомными скриптами или готовыми плагинами (например, Dialogic).

### Глобальная структура (Паттерн Singleton/Autoload)
Проект будет использовать модульную архитектуру, управляемую Autoload-синглтонами:
1. `GameManager`: Хранит глобальное состояние забега (колода игрока, текущее здоровье/рассудок, артефакты, номер этажа).
2. `MapManager`: Управляет графом карты, сохраняет выбранный путь.
3. `CombatSystem`: Оркестратор боя. Управляет очередностью ходов, глобальными эффектами и синхронизирует три независимые линии.
4. `DialogueSystem`: Парсер скриптов (JSON/Ink/Resource), который выводит текст, спрайты персонажей и варианты ответов, а также применяет проверки рассудка.

### State Machine (Конечный автомат)
Для предотвращения утечек памяти и перегрузки, мы используем паттерн "Смена сцен" (Scene Switching) под управлением `GameManager`.
* **Сцены:** `MapScene.tscn`, `CombatScene.tscn`, `DialogueScene.tscn`.
* **Переходы:** При выборе узла на карте, `MapScene` вызывает `GameManager.enter_node(node_data)`. `GameManager` уничтожает сцену карты (`get_tree().change_scene_to_file()`) и загружает нужную сцену (Бой или Диалог), передавая ей необходимые параметры. Глобальные данные (колода, ХП) остаются в памяти внутри `GameManager`.

---

## 2. Структура Боевой Сцены (Artifact-style)

Каждая линия (Алтарь) — это независимая сцена `BoardController.tscn`, вложенная в общую сцену боя.

### Node Tree (`CombatScene.tscn`)
```text
CombatScene (Control)
├── Background (TextureRect) # Темный фон храма
├── BoardContainer (HBoxContainer) # Выравнивает 3 линии
│   ├── LaneLeft (BoardController)
│   ├── LaneCenter (BoardController)
│   ├── LaneRight (BoardController)
├── PlayerUI (CanvasLayer)
│   ├── HandContainer (HBoxContainer) # Карты в руке
│   ├── DeckStatus (VBoxContainer)
│   └── EndTurnButton (Button)
└── CombatSystem (Node) # Оркестратор
```

### Node Tree (`BoardController.tscn` - Одиночная линия)
```text
BoardController (PanelContainer)
├── LaneUI (VBoxContainer)
│   ├── EnemyAltar (ProgressBar + Label)
│   ├── EnemyMinions (HBoxContainer)
│   ├── ConflictZone (Control - для анимаций столкновения)
│   ├── PlayerMinions (HBoxContainer)
│   └── PlayerAltar (ProgressBar + Label)
└── LocalManaManager (Node)
```

---

## 3. Визуальная Новелла и UI (Темы)

### Настройка Theme Resource (CultTheme.tres)
Для поддержания атмосферы космического хоррора (Dark Mode + Neon Crimson):
1. **Шрифты:** Использовать шрифты с засечками для лора (Crimson Text) и футуристичные гротески (Rajdhani) для UI. Включить Outline (Color: `#3a0000`, Size: 2) для читаемости.
2. **Панели (PanelContainer/Panel):** Использовать `StyleBoxFlat`.
   * `bg_color`: `#08080C` (Почти черный, бездонный цвет Бездны).
   * `border_color`: `#8A0303` (Кроваво-красный).
   * `border_width`: 2px по всем краям.
   * `corner_radius`: 0px (острые агрессивные углы) или небольшие скосы.
3. **Эффекты (WorldEnvironment):** Добавить в корневые сцены `WorldEnvironment`. Включить `Glow` (Bloom), выставить `HDR Threshold` на 1.0. Тексты кнопок (например, "Завершить ход") делать цветом `#ff2a2a` со значением RAW `Color(1.5, 0.2, 0.2)`, что заставит их светиться неоном благодаря Glow.
4. **Кнопки (Button):**
   * *Normal:* Темно-серый фон с бордовой рамкой.
   * *Hover:* Заливка кровавым градиентом, свечение текста усиливается.
   * *Pressed:* Сдвиг контента вниз-вправо, эффект "глитча" (через кастомный CanvasItem шейдер).
