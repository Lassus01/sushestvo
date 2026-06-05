class_name CardResource
extends Resource

@export var card_name: String = "Unknown Card"
@export var art: Texture2D
@export var blood_cost: int = 1
@export var attack: int = 1
@export var health: int = 1
@export var traits: Array[String] = [] # e.g., "Taunt", "Charge"

# Placeholder for a script/effect that could be executed
# e.g. "Battlecry: deal 2 damage"
# This might be expanded later
@export var effect_script: Script
