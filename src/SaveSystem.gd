extends Node

# Handles serialization of game state to a JSON file.

const SAVE_PATH = "user://save_game.json"

func save_game():
	var save_dict = {
		"current_floor": GameManager.current_floor,
		"player_health": GameManager.player_health,
		"player_sanity": GameManager.player_sanity,
		"deck_paths": []
	}

	# Try saving map_nodes if MapManager exists (mock map_nodes support)
	if GameManager.has_method("get") and "map_nodes" in GameManager:
		save_dict["map_nodes"] = GameManager.map_nodes

	# Properly save resource paths for deck
	for card in GameManager.player_deck:
		if card is Resource and card.resource_path != "":
			save_dict["deck_paths"].append(card.resource_path)

	var save_file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if save_file:
		var json_string = JSON.stringify(save_dict)
		save_file.store_line(json_string)
		save_file.close()
		print("Game saved successfully to ", SAVE_PATH)
	else:
		push_error("Failed to open save file for writing.")

func load_game():
	if not FileAccess.file_exists(SAVE_PATH):
		print("No save file found.")
		return

	var save_file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if save_file:
		var json_string = save_file.get_line()
		var json = JSON.new()
		var error = json.parse(json_string)
		if error == OK:
			var data = json.get_data()
			if typeof(data) == TYPE_DICTIONARY:
				if data.has("current_floor"): GameManager.current_floor = data["current_floor"]
				if data.has("player_health"): GameManager.player_health = data["player_health"]
				if data.has("player_sanity"): GameManager.player_sanity = data["player_sanity"]

				if data.has("map_nodes") and "map_nodes" in GameManager:
					GameManager.map_nodes = data["map_nodes"]

				if data.has("deck_paths"):
					GameManager.player_deck.clear()
					for path in data["deck_paths"]:
						if ResourceLoader.exists(path):
							var card = load(path)
							GameManager.player_deck.append(card)

				print("Game loaded successfully.")
			else:
				push_error("Parsed save file is not a dictionary.")
		else:
			push_error("JSON Parse Error: ", json.get_error_message(), " in ", json_string, " at line ", json.get_error_line())
		save_file.close()
	else:
		push_error("Failed to open save file for reading.")
