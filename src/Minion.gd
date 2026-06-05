class_name Minion
extends PanelContainer

var attack: int = 0
var health: int = 0
var max_health: int = 0
var minion_name: String = ""

@onready var name_label = $VBox/Name
@onready var attack_label = $VBox/HBox/Attack
@onready var health_label = $VBox/HBox/Health


func _ready():
	update_ui()

func setup(card: CardResource):
	minion_name = card.card_name
	attack = card.attack
	health = card.health
	max_health = health
	update_ui()

func prepare_for_turn():
	pass

func take_damage(amount: int):
	health -= amount
	update_ui()

	# Shake animation
	if is_inside_tree():
		var tween = create_tween()
		var original_pos = position
		tween.tween_property(self, "position", original_pos + Vector2(10, 0), 0.05)
		tween.tween_property(self, "position", original_pos - Vector2(10, 0), 0.05)
		tween.tween_property(self, "position", original_pos, 0.05)

	if health <= 0:
		die()

func die():
	if is_inside_tree():
		var tween = create_tween()
		tween.tween_property(self, "modulate:a", 0.0, 0.3)
		tween.tween_callback(queue_free)
	else:
		queue_free()

func update_ui():
	if name_label: name_label.text = minion_name
	if attack_label: attack_label.text = str(attack)
	if health_label: health_label.text = str(health)
