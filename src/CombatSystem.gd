extends Node

# Stub for CombatSystem to link everything together
signal turn_ended(is_player_turn)

var is_player_turn = true

@onready var ai_controller = $"../AIController"
@onready var sfx_player = $"../SFXPlayer"

func _ready():
	var end_turn_btn = $"../PlayerUI/EndTurnButton"
	if end_turn_btn:
		end_turn_btn.pressed.connect(_on_end_turn_pressed)

func _on_end_turn_pressed():
	if not is_player_turn: return

	if sfx_player:
		# Play placeholder sound logic
		pass

	is_player_turn = false
	emit_signal("turn_ended", false)

	# Execute AI turn
	if ai_controller:
		ai_controller.take_turn()

	# Simple turn resolution and back to player
	resolve_combat()
	start_player_turn()

func resolve_combat():
	var board = $"../BoardContainer"
	if board:
		for lane in board.get_children():
			if lane.has_method("resolve_combat"):
				lane.resolve_combat()

func start_player_turn():
	is_player_turn = true
	var board = $"../BoardContainer"
	if board:
		for lane in board.get_children():
			if lane.has_method("start_turn"):
				lane.start_turn(true)
	emit_signal("turn_ended", true)
