class_name CardVisual
extends Control

@export var card_resource: CardResource

@onready var name_label = $NameLabel
@onready var cost_label = $CostLabel
@onready var attack_label = $StatsContainer/AttackLabel
@onready var health_label = $StatsContainer/HealthLabel
@onready var art_rect = $Art

func _ready():
	if card_resource:
		update_visuals()

func setup(resource: CardResource):
	card_resource = resource
	update_visuals()

func update_visuals():
	if not is_node_ready():
		return
	if card_resource:
		name_label.text = card_resource.card_name
		cost_label.text = str(card_resource.blood_cost)
		attack_label.text = str(card_resource.attack)
		health_label.text = str(card_resource.health)
		if card_resource.art:
			art_rect.texture = card_resource.art

func _get_drag_data(at_position: Vector2):
	var drag_preview = Control.new()
	var preview_card = load("res://scenes/Combat/CardVisual.tscn").instantiate()
	preview_card.setup(card_resource)
	preview_card.position = -preview_card.custom_minimum_size / 2
	drag_preview.add_child(preview_card)
	set_drag_preview(drag_preview)

	return { "type": "card", "resource": card_resource, "source": self }
