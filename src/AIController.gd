extends Node

# AIController: Evaluates lanes and makes decisions for the Enemy.
# It should be a child of CombatSystem or CombatScene.

var combat_scene: Node
var lanes: Array = []

func _ready():
	# Wait for the scene to be ready before finding lanes
	call_deferred("_initialize_lanes")

func _initialize_lanes():
	# Try to find the BoardContainer and its lanes
	combat_scene = get_parent()
	if combat_scene and combat_scene.has_node("BoardContainer"):
		var board_container = combat_scene.get_node("BoardContainer")
		lanes = board_container.get_children()

# Called by CombatSystem when it's the enemy's turn
func take_turn():
	if lanes.is_empty():
		return

	# For each lane, evaluate state
	for lane in lanes:
		if not lane is BoardController:
			continue

		var p_health = lane.player_altar_health
		var e_health = lane.enemy_altar_health

		# Simple logic:
		# If enemy altar is in danger (e.g. < 15), try to play a defensive minion
		if e_health < 15:
			_try_play_card(lane, "Taunt")
		# If player altar is low, go for the kill
		elif p_health < 15:
			_try_play_card(lane, "Charge")
		else:
			# Just play something random if we have mana
			_try_play_card(lane, "")

func _try_play_card(lane: BoardController, preferred_trait: String):
	# Dummy implementation since we don't have an enemy deck setup yet.
	# We just create a dummy card and play it if mana allows.

	if lane.current_mana < 1:
		return

	var card = CardResource.new()
	card.blood_cost = 1
	card.attack = 1
	card.health = 2

	if preferred_trait == "Taunt":
		card.card_name = "Страж Алтаря"
		card.traits = ["Taunt"]
		card.health = 4
	elif preferred_trait == "Charge":
		card.card_name = "Безумец"
		card.traits = ["Charge"]
		card.attack = 3
	else:
		card.card_name = "Культист"

	if lane.can_play_card(card, false):
		lane.play_card(card, false)
