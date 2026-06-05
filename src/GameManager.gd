# class_name GameManager
extends Node

# Глобальный синглтон (Autoload: "GameManager")
# Отвечает за хранение мета-состояния забега

enum GameState { MAP, COMBAT, DIALOGUE }

var current_state: GameState = GameState.MAP
var player_deck: Array[Resource] = []
var player_health: int = 100
var player_sanity: int = 30 # Рассудок
var current_floor: int = 1

# Ссылки на упакованные сцены
var map_scene = preload("res://scenes/Map/MapScene.tscn")
var combat_scene = preload("res://scenes/Combat/CombatScene.tscn")
var dialogue_scene = preload("res://scenes/Dialogue/DialogueScene.tscn")

signal state_changed(new_state: GameState)
signal sanity_changed(new_amount: int)


func _ready() -> void:
	print("GameManager initialized. Dark Rituals begin.")

func start_dialogue(timeline: String) -> void:
	if Engine.has_singleton("Dialogic"):
		var dialog = ClassDB.instantiate("Dialogic")
		# This requires dialogic integration for Godot 4, for now just print
		print("Starting timeline: ", timeline)
		# Dialogic.start(timeline)


func enter_node(node_data: Dictionary) -> void:
	# node_data содержит инфу из MapGenerator
	match node_data.type:
		"combat", "elite":
			_change_scene(combat_scene, GameState.COMBAT, node_data)
		"event", "shrine":
			_change_scene(dialogue_scene, GameState.DIALOGUE, node_data)
		_:
			push_error("Unknown node type: ", node_data.type)

func return_to_map() -> void:
	_change_scene(map_scene, GameState.MAP, {})
	current_floor += 1

func modify_sanity(amount: int) -> void:
	player_sanity += amount
	player_sanity = clampi(player_sanity, 0, 30)
	emit_signal("sanity_changed", player_sanity)
	if player_sanity <= 0:
		trigger_game_over("Рассудок поглощен Бездной.")

func _change_scene(scene_resource: PackedScene, new_state: GameState, _data: Dictionary) -> void:
	# В реальном проекте _data передается в новую сцену после инстанцирования
	current_state = new_state
	get_tree().change_scene_to_packed(scene_resource)
	emit_signal("state_changed", current_state)

func trigger_game_over(reason: String) -> void:
	print("GAME OVER: ", reason)
	# TODO: Загрузка сцены проигрыша
