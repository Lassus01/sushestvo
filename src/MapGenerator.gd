class_name MapGenerator
extends Node

# Генерирует направленный ациклический граф (DAG) для глобальной карты
# Slay the Spire style

const MAP_LAYERS = 15
const NODES_PER_LAYER_MIN = 2
const NODES_PER_LAYER_MAX = 4

enum NodeType { START, COMBAT, ELITE, EVENT, SHRINE, BOSS }

# Словарь: Ключ - Vector2(layer, index), Значение - Данные узла
var map_nodes: Dictionary = {}
var map_connections: Array[Dictionary] = [] # { from: Vector2, to: Vector2 }

func generate_map() -> void:
	map_nodes.clear()
	map_connections.clear()

	# Слой 0 - Старт
	_create_node(Vector2(0, 0), NodeType.START)

	# Промежуточные слои (1 до MAP_LAYERS-2)
	var prev_layer_nodes = [Vector2(0, 0)]

	for layer in range(1, MAP_LAYERS - 1):
		var current_layer_nodes = []
		var node_count = randi_range(NODES_PER_LAYER_MIN, NODES_PER_LAYER_MAX)

		for i in range(node_count):
			var pos = Vector2(layer, i)
			var type = _get_random_node_type(layer)
			_create_node(pos, type)
			current_layer_nodes.append(pos)

		# Соединяем слои (чтобы не было тупиков)
		_connect_layers(prev_layer_nodes, current_layer_nodes)
		prev_layer_nodes = current_layer_nodes

	# Последний слой - Босс
	var boss_pos = Vector2(MAP_LAYERS - 1, 0)
	_create_node(boss_pos, NodeType.BOSS)
	for node in prev_layer_nodes:
		map_connections.append({ "from": node, "to": boss_pos })

func _create_node(pos: Vector2, type: NodeType) -> void:
	var node_data = {
		"position": pos,
		"type": _type_to_string(type),
		"visited": false,
		"clickable": false
	}
	map_nodes[pos] = node_data

func _connect_layers(layer1: Array, layer2: Array) -> void:
	# Простая логика соединения: каждый узел layer1 должен иметь хотя бы один выход.
	# Каждый узел layer2 должен иметь хотя бы один вход.
	for n1 in layer1:
		var target = layer2[randi() % layer2.size()]
		map_connections.append({ "from": n1, "to": target })

	for n2 in layer2:
		var has_input = false
		for conn in map_connections:
			if conn.to == n2:
				has_input = true
				break
		if not has_input:
			var source = layer1[randi() % layer1.size()]
			map_connections.append({ "from": source, "to": n2 })

func _get_random_node_type(layer: int) -> NodeType:
	if layer == 1: return NodeType.COMBAT # Первый этаж всегда обычный бой

	var r = randf()
	if r < 0.4: return NodeType.COMBAT
	elif r < 0.65: return NodeType.EVENT
	elif r < 0.85: return NodeType.ELITE
	else: return NodeType.SHRINE

func _type_to_string(type: NodeType) -> String:
	match type:
		NodeType.START: return "start"
		NodeType.COMBAT: return "combat"
		NodeType.ELITE: return "elite"
		NodeType.EVENT: return "event"
		NodeType.SHRINE: return "shrine"
		NodeType.BOSS: return "boss"
	return "unknown"

# Вызывается UI карты, когда игрок кликает по узлу
func on_node_clicked(pos: Vector2) -> void:
	if map_nodes.has(pos):
		var data = map_nodes[pos]
		# Передаем управление в GameManager для загрузки нужной сцены
		GameManager.enter_node(data)
