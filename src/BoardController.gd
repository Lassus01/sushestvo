class_name BoardController
extends PanelContainer

# Управляет логикой ОДНОЙ из ТРЕХ линий (Алтарей)

signal altar_destroyed(is_player_altar: bool)

@export var max_minions: int = 5
@export var initial_altar_health: int = 40

# Локальная мана (Капли Крови) линии
var max_mana: int = 1
var current_mana: int = 1

# Здоровье Алтарей на этой линии
var player_altar_health: int
var enemy_altar_health: int

# Массивы существ (в Godot 4 лучше типизировать Array)
var player_minions: Array[Node] = []
var enemy_minions: Array[Node] = []

# UI Элементы
@onready var player_minions_container = $LaneUI/PlayerMinions
@onready var enemy_minions_container = $LaneUI/EnemyMinions
@onready var player_altar_label = $LaneUI/PlayerAltar/Label
@onready var enemy_altar_label = $LaneUI/EnemyAltar/Label

func _ready() -> void:
	player_altar_health = initial_altar_health
	enemy_altar_health = initial_altar_health
	_update_ui()

# Вызывается из глобального CombatSystem каждый ход
func start_turn(is_player: bool) -> void:
	if is_player:
		max_mana = mini(max_mana + 1, 10)
		current_mana = max_mana
		for minion in player_minions:
			minion.prepare_for_turn()
	else:
		for minion in enemy_minions:
			minion.prepare_for_turn()
	_update_ui()

func can_play_card(card_data, is_player: bool) -> bool:
	if is_player:
		if current_mana < card_data.blood_cost:
			return false
		if player_minions.size() >= max_minions:
			return false
	return true

func play_card(card_data, is_player: bool) -> void:
	if not can_play_card(card_data, is_player):
		return

	if is_player:
		current_mana -= card_data.blood_cost

	var minion_node = preload("res://scenes/Combat/Minion.tscn").instantiate()
	minion_node.setup(card_data)

	if is_player:
		player_minions.append(minion_node)
		player_minions_container.add_child(minion_node)
	else:
		enemy_minions.append(minion_node)
		enemy_minions_container.add_child(minion_node)

	_update_ui()

# Автоматическая фаза боя Artifact-style (соседи бьют соседей)
func resolve_combat() -> void:
	var max_slots = maxi(player_minions.size(), enemy_minions.size())

	for i in range(max_slots):
		var p_minion = player_minions[i] if i < player_minions.size() else null
		var e_minion = enemy_minions[i] if i < enemy_minions.size() else null

		# Если существо игрока есть
		if p_minion != null:
			if e_minion != null:
				e_minion.take_damage(p_minion.attack)
			else:
				# Бьет по алтарю, если нет блокера
				take_altar_damage(p_minion.attack, false)

		# Если существо врага есть
		if e_minion != null:
			if p_minion != null:
				p_minion.take_damage(e_minion.attack)
			else:
				take_altar_damage(e_minion.attack, true)

	_cleanup_dead_minions()

func take_altar_damage(amount: int, is_player_altar: bool) -> void:
	if is_player_altar:
		player_altar_health -= amount
		if player_altar_health <= 0:
			emit_signal("altar_destroyed", true)
	else:
		enemy_altar_health -= amount
		if enemy_altar_health <= 0:
			emit_signal("altar_destroyed", false)
	_update_ui()

func _cleanup_dead_minions() -> void:
	# Логика удаления мертвых существ из массивов и дерева
	pass

func _update_ui() -> void:
	if player_altar_label:
		player_altar_label.text = str(player_altar_health)
	if enemy_altar_label:
		enemy_altar_label.text = str(enemy_altar_health)

func _can_drop_data(at_position: Vector2, data: Variant) -> bool:
	if typeof(data) == TYPE_DICTIONARY and data.has("type") and data["type"] == "card":
		return can_play_card(data["resource"], true)
	return false

func _drop_data(at_position: Vector2, data: Variant) -> void:
	if typeof(data) == TYPE_DICTIONARY and data.has("type") and data["type"] == "card":
		play_card(data["resource"], true)
		if data.has("source") and is_instance_valid(data["source"]):
			data["source"].queue_free()
