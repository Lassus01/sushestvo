extends HBoxContainer

func _ready():
	# Placeholder: spawn some test cards
	var test_card = load("res://resources/cards/Cultist.tres")
	if test_card:
		for i in range(3):
			var visual = preload("res://scenes/Combat/CardVisual.tscn").instantiate()
			visual.setup(test_card)
			add_child(visual)
