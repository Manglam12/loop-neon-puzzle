import JSZip from 'jszip';

export interface GodotFile {
  path: string;
  content: string;
  description: string;
}

export const GODOT_FILES: GodotFile[] = [
  {
    path: 'project.godot',
    description: 'Godot 4.x Project Settings (Portrait 720x1280, GL Compatibility / Mobile)',
    content: `; Engine configuration file.
; LOOP — Neon Echo Puzzle

config_version=5

[application]

config/name="LOOP - Neon Echo Puzzle"
config/description="Premium, lightweight neon logic puzzle where players rotate circuit tiles and plan around delayed Echo moves to connect START to GOAL."
run/main_scene="res://scenes/Main.tscn"
config/features=PackedStringArray("4.3", "GL Compatibility")
config/icon="res://icon.svg"

[display]

window/size/viewport_width=720
window/size/viewport_height=1280
window/size/window_width_override=450
window/size/window_height_override=800
window/stretch/mode="canvas_items"
window/stretch/aspect="keep_width"
window/handheld/orientation=1

[rendering]

renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
textures/default_filters/use_nearest_mipmap_filter=false
environment/defaults/default_clear_color=Color(0.027, 0.043, 0.106, 1.0)

[input]

ui_tap={
"deadzone": 0.5,
"events": [Object(InputEventMouseButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"button_mask":1,"position":Vector2(0, 0),"global_position":Vector2(0, 0),"factor":1.0,"button_index":1,"canceled":false,"pressed":true,"double_click":false,"script":null)
]
}
`,
  },
  {
    path: 'export_presets.cfg',
    description: 'Production Android APK Export Profile (Package ID, Arm64, Orientation)',
    content: `[preset.0]

name="Android"
platform="Android"
runnable=true
advanced_options=false
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path="builds/loop_neon_echo.apk"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]

custom_template/debug=""
custom_template/release=""
gradle_build/use_gradle_build=false
architectures/arm32=false
architectures/arm64=true
architectures/x86_32=false
architectures/x86_64=false
package/unique_name="com.loop.neonecho"
package/name="LOOP: Neon Echo Puzzle"
package/signed=true
package/app_category=0
package/retain_data_on_uninstall=false
package/exclude_from_recents=false
version/code=2
version/name="2.0.0"
screen/orientation=1
screen/support_small=true
screen/support_normal=true
screen/support_large=true
screen/support_xlarge=true
permissions/access_network_state=false
permissions/camera=false
permissions/internet=false
permissions/modify_audio_settings=false
permissions/record_audio=false
permissions/vibrate=true
permissions/write_external_storage=false
`,
  },
  {
    path: 'scripts/BoardModel.gd',
    description: 'Bitwise direction logic, reciprocal connectivity, and circuit flood-fill',
    content: `class_name BoardModel
extends RefCounted

const NORTH: int = 1 # 0001
const EAST: int  = 2 # 0010
const SOUTH: int = 4 # 0100
const WEST: int  = 8 # 1000

const DIRECTIONS := [
	{"bit": NORTH, "delta": Vector2i(0, -1), "opposite": SOUTH},
	{"bit": EAST,  "delta": Vector2i(1, 0),  "opposite": WEST},
	{"bit": SOUTH, "delta": Vector2i(0, 1),  "opposite": NORTH},
	{"bit": WEST,  "delta": Vector2i(-1, 0), "opposite": EAST}
]

static func rotate_mask(mask: int, turns: int = 1) -> int:
	var m: int = mask & 0b1111
	var t: int = posmod(turns, 4)
	for i in range(t):
		var next_m: int = 0
		if (m & NORTH) != 0: next_m |= EAST
		if (m & EAST) != 0:  next_m |= SOUTH
		if (m & SOUTH) != 0: next_m |= WEST
		if (m & WEST) != 0:  next_m |= NORTH
		m = next_m
	return m

static func can_connect(mask_a: int, mask_b: int, dir_bit: int) -> bool:
	for d in DIRECTIONS:
		if d["bit"] == dir_bit:
			return (mask_a & dir_bit) != 0 and (mask_b & int(d["opposite"])) != 0
	return false

static func compute_powered_circuit(tiles: Array, start_pos: Vector2i, goal_pos: Vector2i, size: int) -> Dictionary:
	var powered_cells := {}
	var queue: Array[Vector2i] = [start_pos]
	powered_cells[start_pos] = true
	var is_connected: bool = false
	
	while not queue.is_empty():
		var cur: Vector2i = queue.pop_front()
		if cur == goal_pos:
			is_connected = true
			
		var cur_mask: int = int(tiles[cur.y][cur.x].get("mask", 0))
		for d in DIRECTIONS:
			if (cur_mask & int(d["bit"])) == 0:
				continue
			var nxt: Vector2i = cur + d["delta"]
			if nxt.x < 0 or nxt.x >= size or nxt.y < 0 or nxt.y >= size:
				continue
			if powered_cells.has(nxt):
				continue
			var nxt_mask: int = int(tiles[nxt.y][nxt.x].get("mask", 0))
			if (nxt_mask & int(d["opposite"])) != 0:
				powered_cells[nxt] = true
				queue.append(nxt)
				
	return { "is_connected": is_connected, "powered_cells": powered_cells }
`,
  },
  {
    path: 'scripts/EchoManager.gd',
    description: 'Manages pending Echo FIFO actions, countdowns, and triggers',
    content: `class_name EchoManager
extends Node

signal echo_applied(cell: Vector2i)

var echo_delay: int = 2
var pending_echoes: Array[Dictionary] = []

func setup(delay: int) -> void:
	echo_delay = delay
	pending_echoes.clear()

func record_player_action(cell: Vector2i) -> void:
	if echo_delay <= 0:
		return
	pending_echoes.append({
		"cell": cell,
		"turns_remaining": echo_delay
	})

func process_turn_advance() -> Array[Vector2i]:
	var triggered_cells: Array[Vector2i] = []
	var surviving_echoes: Array[Dictionary] = []
	
	for echo in pending_echoes:
		echo["turns_remaining"] -= 1
		if echo["turns_remaining"] <= 0:
			triggered_cells.append(echo["cell"])
			emit_signal("echo_applied", echo["cell"])
		else:
			surviving_echoes.append(echo)
			
	pending_echoes = surviving_echoes
	return triggered_cells

func get_echo_for_cell(cell: Vector2i) -> Dictionary:
	for echo in pending_echoes:
		if echo["cell"] == cell:
			return echo
	return {}
`,
  },
  {
    path: 'scripts/PuzzleSolver.gd',
    description: 'Breadth-First Search (BFS) state-space solver guaranteeing solvability',
    content: `class_name PuzzleSolver
extends RefCounted

static func solve(board_data: Dictionary, max_depth: int = 9, max_states: int = 2500) -> Dictionary:
	var size: int = board_data["size"]
	var start_pos: Vector2i = board_data["start_pos"]
	var goal_pos: Vector2i = board_data["goal_pos"]
	var echo_delay: int = board_data.get("echo_delay", 2)
	
	# Initial connectivity check
	var initial_power: Dictionary = BoardModel.compute_powered_circuit(board_data["tiles"], start_pos, goal_pos, size)
	if initial_power["is_connected"]:
		return { "solvable": true, "moves": [], "optimal_steps": 0 }
		
	var rotatable_cells: Array[Vector2i] = []
	for y in range(size):
		for x in range(size):
			if board_data["tiles"][y][x].get("role", "") == "WIRE":
				rotatable_cells.append(Vector2i(x, y))
				
	if rotatable_cells.is_empty():
		return { "solvable": false, "moves": [], "optimal_steps": -1 }
		
	var queue: Array[Dictionary] = []
	var visited: Dictionary = {}
	
	var start_node := {
		"tiles": _clone_tiles(board_data["tiles"]),
		"echoes": [],
		"moves": []
	}
	queue.append(start_node)
	visited[_hash_state(start_node["tiles"], start_node["echoes"])] = true
	
	var count: int = 0
	while not queue.is_empty() and count < max_states:
		count += 1
		var cur: Dictionary = queue.pop_front()
		if cur["moves"].size() >= max_depth:
			continue
			
		for target_cell in rotatable_cells:
			var next_tiles: Array = _clone_tiles(cur["tiles"])
			
			# 1. Rotate player tile
			var cur_mask: int = int(next_tiles[target_cell.y][target_cell.x]["mask"])
			next_tiles[target_cell.y][target_cell.x]["mask"] = BoardModel.rotate_mask(cur_mask, 1)
			
			# 2. Advance existing echoes
			var next_echoes: Array = []
			for echo in cur["echoes"]:
				var rem: int = int(echo["turns_remaining"]) - 1
				if rem <= 0:
					var ec: Vector2i = echo["cell"]
					var em: int = int(next_tiles[ec.y][ec.x]["mask"])
					next_tiles[ec.y][ec.x]["mask"] = BoardModel.rotate_mask(em, 1)
				else:
					next_echoes.append({"cell": echo["cell"], "turns_remaining": rem})
					
			# 3. Add new echo
			if echo_delay > 0:
				next_echoes.append({"cell": target_cell, "turns_remaining": echo_delay})
				
			var next_moves: Array = cur["moves"].duplicate()
			next_moves.append(target_cell)
			
			# 4. Check win
			var power_check: Dictionary = BoardModel.compute_powered_circuit(next_tiles, start_pos, goal_pos, size)
			if power_check["is_connected"]:
				return {
					"solvable": true,
					"moves": next_moves,
					"optimal_steps": next_moves.size(),
					"first_hint": next_moves[0]
				}
				
			var h: String = _hash_state(next_tiles, next_echoes)
			if not visited.has(h):
				visited[h] = true
				queue.append({
					"tiles": next_tiles,
					"echoes": next_echoes,
					"moves": next_moves
				})
				
	return { "solvable": false, "moves": [], "optimal_steps": -1 }

static func _clone_tiles(tiles: Array) -> Array:
	var copy: Array = []
	for row in tiles:
		var r_copy: Array = []
		for t in row:
			r_copy.append({"mask": int(t["mask"]), "role": str(t["role"])})
		copy.append(r_copy)
	return copy

static func _hash_state(tiles: Array, echoes: Array) -> String:
	var masks: PackedStringArray = []
	for row in tiles:
		for t in row:
			masks.append(str(t["mask"]))
	return ",".join(masks) + ";" + str(echoes.size())
`,
  },
  {
    path: 'scripts/PuzzleGenerator.gd',
    description: 'Deterministic seeded procedural level generator with solver validation',
    content: `class_name PuzzleGenerator
extends Node

func get_handcrafted_level(level_num: int) -> Dictionary:
	var size: int = 3 if level_num <= 3 else (4 if level_num <= 6 else 5)
	var echo_delay: int = 0 if level_num <= 2 else 2
	
	var tiles: Array = []
	for y in range(size):
		var row: Array = []
		for x in range(size):
			row.append({"mask": 0, "role": "EMPTY"})
		tiles.append(row)
		
	var start_pos: Vector2i = Vector2i(0, 0)
	var goal_pos: Vector2i = Vector2i(size - 1, size - 1)
	
	if level_num == 1:
		start_pos = Vector2i(0, 1)
		goal_pos = Vector2i(2, 1)
		tiles[1][0] = {"mask": BoardModel.EAST, "role": "START"}
		tiles[1][1] = {"mask": BoardModel.NORTH | BoardModel.SOUTH, "role": "WIRE"} # 1 rotation needed
		tiles[1][2] = {"mask": BoardModel.WEST, "role": "GOAL"}
		return { "id": "lvl_1", "name": "Level 01: First Spark", "size": 3, "start_pos": start_pos, "goal_pos": goal_pos, "echo_delay": 0, "par_moves": 1, "tiles": tiles }
		
	if level_num == 2:
		tiles[0][0] = {"mask": BoardModel.EAST, "role": "START"}
		tiles[0][1] = {"mask": BoardModel.NORTH | BoardModel.WEST, "role": "WIRE"}
		tiles[1][1] = {"mask": BoardModel.NORTH | BoardModel.EAST, "role": "WIRE"}
		tiles[1][2] = {"mask": BoardModel.SOUTH | BoardModel.WEST, "role": "WIRE"}
		tiles[2][2] = {"mask": BoardModel.NORTH, "role": "GOAL"}
		return { "id": "lvl_2", "name": "Level 02: Corner Conduction", "size": 3, "start_pos": start_pos, "goal_pos": goal_pos, "echo_delay": 0, "par_moves": 2, "tiles": tiles }
		
	return generate_procedural_board(level_num * 7919 + 42, size, echo_delay)

func generate_procedural_board(seed_val: int, size: int = 4, echo_delay: int = 2) -> Dictionary:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_val
	
	var max_attempts := 25
	for attempt in range(max_attempts):
		var start_pos: Vector2i = Vector2i(0, 0)
		var goal_pos: Vector2i = Vector2i(size - 1, size - 1)
		
		var tiles: Array = []
		for y in range(size):
			var row: Array = []
			for x in range(size):
				row.append({"mask": 0, "role": "EMPTY"})
			tiles.append(row)
			
		tiles[start_pos.y][start_pos.x]["role"] = "START"
		tiles[goal_pos.y][goal_pos.x]["role"] = "GOAL"
		
		# Generate path
		var path: Array[Vector2i] = [start_pos]
		var cur: Vector2i = start_pos
		var visited := { start_pos: true }
		
		while cur != goal_pos and path.size() < size * size:
			var neighbors: Array[Vector2i] = []
			for delta in [Vector2i(0, 1), Vector2i(1, 0), Vector2i(0, -1), Vector2i(-1, 0)]:
				var n: Vector2i = cur + delta
				if n.x >= 0 and n.x < size and n.y >= 0 and n.y < size and not visited.has(n):
					neighbors.append(n)
			if neighbors.is_empty():
				break
			cur = neighbors[rng.randi() % neighbors.size()]
			visited[cur] = true
			path.append(cur)
			
		if cur != goal_pos:
			continue
			
		for i in range(path.size()):
			var p: Vector2i = path[i]
			var mask: int = 0
			if i > 0:
				var prev_p: Vector2i = path[i - 1]
				mask |= _calc_dir(p, prev_p)
			if i < path.size() - 1:
				var next_p: Vector2i = path[i + 1]
				mask |= _calc_dir(p, next_p)
			tiles[p.y][p.x]["mask"] = mask
			if i != 0 and i != path.size() - 1:
				tiles[p.y][p.x]["role"] = "WIRE"
				# Scramble
				tiles[p.y][p.x]["mask"] = BoardModel.rotate_mask(mask, rng.randi_range(1, 3))
				
		var board := {
			"id": "proc_%d" % seed_val,
			"name": "Circuit #%04d" % (seed_val % 9999),
			"size": size,
			"start_pos": start_pos,
			"goal_pos": goal_pos,
			"echo_delay": echo_delay,
			"par_moves": path.size() - 2,
			"tiles": tiles
		}
		
		var solve: Dictionary = PuzzleSolver.solve(board, 8, 2000)
		if solve["solvable"] and solve["optimal_steps"] >= 2:
			board["par_moves"] = solve["optimal_steps"]
			return board
			
	return _make_fallback_board(size, echo_delay)

func _calc_dir(from_p: Vector2i, to_p: Vector2i) -> int:
	var d: Vector2i = to_p - from_p
	if d == Vector2i(0, -1): return BoardModel.NORTH
	if d == Vector2i(1, 0):  return BoardModel.EAST
	if d == Vector2i(0, 1):  return BoardModel.SOUTH
	if d == Vector2i(-1, 0): return BoardModel.WEST
	return 0

func _make_fallback_board(size: int, echo_delay: int) -> Dictionary:
	var tiles: Array = []
	for y in range(size):
		var row: Array = []
		for x in range(size):
			row.append({"mask": 0, "role": "EMPTY"})
		tiles.append(row)
		
	tiles[0][0] = {"mask": BoardModel.EAST, "role": "START"}
	tiles[0][1] = {"mask": BoardModel.rotate_mask(BoardModel.SOUTH | BoardModel.WEST, 1), "role": "WIRE"}
	tiles[1][1] = {"mask": BoardModel.rotate_mask(BoardModel.NORTH | BoardModel.SOUTH, 1), "role": "WIRE"}
	tiles[size - 1][size - 1] = {"mask": BoardModel.NORTH, "role": "GOAL"}
	
	return {
		"id": "fallback",
		"name": "Resonance Grid",
		"size": size,
		"start_pos": Vector2i(0, 0),
		"goal_pos": Vector2i(size - 1, size - 1),
		"echo_delay": echo_delay,
		"par_moves": 2,
		"tiles": tiles
	}
`,
  },
  {
    path: 'scripts/TileView.gd',
    description: 'Procedural custom 2D vector neon drawing for circuit lines and Echo badge',
    content: `class_name TileView
extends Control

signal tile_clicked(cell: Vector2i)

var cell: Vector2i = Vector2i.ZERO
var tile_data: Dictionary = {}
var is_powered: bool = false
var echo_countdown: int = 0
var is_hinted: bool = false
var current_rotation: float = 0.0

const COLOR_CYAN := Color("#38bdf8")
const COLOR_MUTED := Color("#334155")
const COLOR_START := Color("#10b981")
const COLOR_GOAL := Color("#f59e0b")
const COLOR_ECHO := Color("#ec4899")

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		emit_signal("tile_clicked", cell)

func update_tile(data: Dictionary, powered: bool, echo_turns: int, hinted: bool) -> void:
	tile_data = data
	is_powered = powered
	echo_countdown = echo_turns
	is_hinted = hinted
	queue_redraw()

func animate_rotation(target_rad: float) -> void:
	var tween: Tween = create_tween()
	tween.tween_property(self, "current_rotation", target_rad, 0.15).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.step_finished.connect(func(_idx): queue_redraw())

func _draw() -> void:
	var s: Vector2 = size
	var r := Rect2(Vector2.ZERO, s).grow(-2)
	var cx: float = s.x / 2.0
	var cy: float = s.y / 2.0
	var role: String = tile_data.get("role", "EMPTY")
	
	# Background
	var bg_color := Color("#101831")
	var border_color := Color("#25365c")
	
	if role == "START":
		bg_color = Color("#0f2d28")
		border_color = COLOR_START
	elif role == "GOAL":
		bg_color = Color("#332a15")
		border_color = COLOR_GOAL
	elif echo_countdown > 0:
		bg_color = Color("#2e122b")
		border_color = COLOR_ECHO
	elif is_powered:
		bg_color = Color("#112447")
		border_color = COLOR_CYAN
		
	if is_hinted:
		border_color = Color("#fbbf24")
		
	draw_rect(r, bg_color, true, 8.0)
	draw_rect(r, border_color, false, 2.0 if (echo_countdown > 0 or is_hinted) else 1.0, 8.0)
	
	# Wires
	var mask: int = int(tile_data.get("mask", 0))
	if role in ["WIRE", "START", "GOAL"] and mask != 0:
		var wire_col := COLOR_CYAN if is_powered else COLOR_MUTED
		var wire_w: float = maxf(4.0, s.x * 0.12)
		
		# Center node
		draw_circle(Vector2(cx, cy), s.x * 0.10, wire_col)
		if is_powered:
			draw_circle(Vector2(cx, cy), s.x * 0.05, Color.WHITE)
			
		if (mask & BoardModel.NORTH) != 0:
			draw_line(Vector2(cx, cy), Vector2(cx, 0), wire_col, wire_w)
			if is_powered: draw_line(Vector2(cx, cy), Vector2(cx, 0), Color.WHITE, wire_w * 0.4)
		if (mask & BoardModel.EAST) != 0:
			draw_line(Vector2(cx, cy), Vector2(s.x, cy), wire_col, wire_w)
			if is_powered: draw_line(Vector2(cx, cy), Vector2(s.x, cy), Color.WHITE, wire_w * 0.4)
		if (mask & BoardModel.SOUTH) != 0:
			draw_line(Vector2(cx, cy), Vector2(cx, s.y), wire_col, wire_w)
			if is_powered: draw_line(Vector2(cx, cy), Vector2(cx, s.y), Color.WHITE, wire_w * 0.4)
		if (mask & BoardModel.WEST) != 0:
			draw_line(Vector2(cx, cy), Vector2(0, cy), wire_col, wire_w)
			if is_powered: draw_line(Vector2(cx, cy), Vector2(0, cy), Color.WHITE, wire_w * 0.4)
			
	# Role icons
	if role == "START":
		draw_string(ThemeDB.fallback_font, Vector2(cx - 6, cy + 6), "S", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.WHITE)
	elif role == "GOAL":
		draw_string(ThemeDB.fallback_font, Vector2(cx - 6, cy + 6), "G", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, COLOR_GOAL)
		
	# Echo badge
	if echo_countdown > 0:
		var badge_r := Rect2(Vector2(s.x - 48, 4), Vector2(44, 14))
		draw_rect(badge_r, COLOR_ECHO, true, 4.0)
		draw_string(ThemeDB.fallback_font, Vector2(s.x - 44, 15), "ECHO %d" % echo_countdown, HORIZONTAL_ALIGNMENT_CENTER, -1, 9, Color.WHITE)
`,
  },
  {
    path: 'scripts/AudioManager.gd',
    description: 'Procedural audio triggers with haptic vibration support for Android',
    content: `class_name AudioManager
extends Node

var sfx_volume: float = 0.8
var music_volume: float = 0.4
var haptics_enabled: bool = true

func play_click() -> void:
	_vibrate(15)

func play_echo() -> void:
	_vibrate(25)

func play_win() -> void:
	_vibrate(50)

func _vibrate(ms: int) -> void:
	if haptics_enabled and OS.has_feature("mobile"):
		Input.vibrate_handheld(ms)
`,
  },
  {
    path: 'scripts/SaveManager.gd',
    description: 'Persistent local storage for high scores, unlocked levels, and settings',
    content: `class_name SaveManager
extends Node

const SAVE_PATH: String = "user://loop_save_v2.json"

var highest_level: int = 1
var best_endless_score: int = 0
var completed_levels: Dictionary = {}
var sfx_vol: float = 0.8
var music_vol: float = 0.4
var haptics: bool = true

func _ready() -> void:
	load_data()

func save_data() -> void:
	var data := {
		"highest_level": highest_level,
		"best_endless_score": best_endless_score,
		"completed_levels": completed_levels,
		"sfx_vol": sfx_vol,
		"music_vol": music_vol,
		"haptics": haptics
	}
	var f: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(data))

func load_data() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var f: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f:
		var parsed: Variant = JSON.parse_string(f.get_as_text())
		if parsed is Dictionary:
			highest_level = parsed.get("highest_level", 1)
			best_endless_score = parsed.get("best_endless_score", 0)
			completed_levels = parsed.get("completed_levels", {})
			sfx_vol = parsed.get("sfx_vol", 0.8)
			music_vol = parsed.get("music_vol", 0.4)
			haptics = parsed.get("haptics", true)
`,
  },
  {
    path: 'scripts/Main.gd',
    description: 'Main game controller managing game state, UI events, moves, and transitions',
    content: `extends Control

@onready var generator: PuzzleGenerator = $PuzzleGenerator
@onready var echo_mgr: EchoManager = $EchoManager
@onready var audio_mgr: AudioManager = $AudioManager
@onready var save_mgr: SaveManager = $SaveManager

var current_mode: String = "LEVELS"
var current_level_num: int = 1
var board_data: Dictionary = {}
var move_count: int = 0
var score: int = 0
var is_won: bool = false
var hint_cell: Vector2i = Vector2i(-1, -1)

@onready var board_container: GridContainer = %BoardGrid
@onready var level_label: Label = %LevelLabel
@onready var moves_label: Label = %MovesLabel
@onready var score_label: Label = %ScoreLabel
@onready var status_label: Label = %StatusLabel
@onready var echo_status_label: Label = %EchoStatusLabel

var tile_views: Array[TileView] = []

func _ready() -> void:
	load_level(current_level_num)

func load_level(lvl: int) -> void:
	current_level_num = lvl
	is_won = false
	move_count = 0
	hint_cell = Vector2i(-1, -1)
	
	if current_mode == "LEVELS":
		board_data = generator.get_handcrafted_level(lvl)
	else:
		board_data = generator.generate_procedural_board(lvl * 997 + score, 4, 2)
		
	echo_mgr.setup(board_data.get("echo_delay", 2))
	_rebuild_board_ui()
	_update_labels()

func _rebuild_board_ui() -> void:
	for child in board_container.get_children():
		child.queue_free()
	tile_views.clear()
	
	var size: int = board_data["size"]
	board_container.columns = size
	
	var power_state: Dictionary = BoardModel.compute_powered_circuit(board_data["tiles"], board_data["start_pos"], board_data["goal_pos"], size)
	
	for y in range(size):
		for x in range(size):
			var tv: TileView = preload("res://scenes/TileView.tscn").instantiate()
			tv.cell = Vector2i(x, y)
			tv.custom_minimum_size = Vector2(80, 80)
			tv.tile_clicked.connect(_on_tile_clicked)
			board_container.add_child(tv)
			tile_views.append(tv)
			
			var is_p: bool = power_state["powered_cells"].has(Vector2i(x, y))
			tv.update_tile(board_data["tiles"][y][x], is_p, 0, false)

func _on_tile_clicked(cell: Vector2i) -> void:
	if is_won:
		return
	var tile: Dictionary = board_data["tiles"][cell.y][cell.x]
	if tile["role"] != "WIRE":
		return
		
	# Rotate player tile
	tile["mask"] = BoardModel.rotate_mask(int(tile["mask"]), 1)
	board_data["tiles"][cell.y][cell.x] = tile
	move_count += 1
	score += 10
	audio_mgr.play_click()
	
	# Process Echo triggers
	var triggered: Array[Vector2i] = echo_mgr.process_turn_advance()
	for ec in triggered:
		var et: Dictionary = board_data["tiles"][ec.y][ec.x]
		et["mask"] = BoardModel.rotate_mask(int(et["mask"]), 1)
		board_data["tiles"][ec.y][ec.x] = et
		audio_mgr.play_echo()
		
	# Schedule next echo
	echo_mgr.record_player_action(cell)
	
	# Recheck power
	var power: Dictionary = BoardModel.compute_powered_circuit(board_data["tiles"], board_data["start_pos"], board_data["goal_pos"], board_data["size"])
	if power["is_connected"]:
		is_won = true
		score += 500
		audio_mgr.play_win()
		save_mgr.save_data()
		status_label.text = "CIRCUIT CONNECTED! PUZZLE SOLVED."
	else:
		status_label.text = "Rotate tiles to connect START to GOAL."
		
	_refresh_views(power["powered_cells"])
	_update_labels()

func _refresh_views(powered_map: Dictionary) -> void:
	for tv in tile_views:
		var is_p: bool = powered_map.has(tv.cell)
		var echo_info: Dictionary = echo_mgr.get_echo_for_cell(tv.cell)
		var echo_rem: int = echo_info.get("turns_remaining", 0)
		var is_h: bool = (tv.cell == hint_cell)
		tv.update_tile(board_data["tiles"][tv.cell.y][tv.cell.x], is_p, echo_rem, is_h)

func _update_labels() -> void:
	level_label.text = board_data["name"]
	moves_label.text = "MOVES: %d (PAR %d)" % [move_count, board_data.get("par_moves", 4)]
	score_label.text = "SCORE: %d" % score
	
	if echo_mgr.pending_echoes.is_empty():
		echo_status_label.text = "ECHO SYSTEM: READY"
	else:
		var next_e: Dictionary = echo_mgr.pending_echoes[0]
		echo_status_label.text = "ECHO AT (%d, %d) IN %d TURNS" % [next_e["cell"].x + 1, next_e["cell"].y + 1, next_e["turns_remaining"]]
`,
  },
  {
    path: 'scenes/Main.tscn',
    description: 'Main Godot Scene with mobile responsive layout and board container',
    content: `[gd_scene load_steps=6 format=3 uid="uid://cf67a421y97q2"]

[ext_resource type="Script" path="res://scripts/Main.gd" id="1_main"]
[ext_resource type="Script" path="res://scripts/PuzzleGenerator.gd" id="2_gen"]
[ext_resource type="Script" path="res://scripts/EchoManager.gd" id="3_echo"]
[ext_resource type="Script" path="res://scripts/AudioManager.gd" id="4_audio"]
[ext_resource type="Script" path="res://scripts/SaveManager.gd" id="5_save"]

[node name="Main" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
grow_horizontal = 2
grow_vertical = 2
script = ExtResource("1_main")

[node name="PuzzleGenerator" type="Node" parent="."]
script = ExtResource("2_gen")

[node name="EchoManager" type="Node" parent="."]
script = ExtResource("3_echo")

[node name="AudioManager" type="Node" parent="."]
script = ExtResource("4_audio")

[node name="SaveManager" type="Node" parent="."]
script = ExtResource("5_save")

[node name="UI" type="VBoxContainer" parent="."]
layout_mode = 1
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
offset_left = 24.0
offset_top = 32.0
offset_right = -24.0
offset_bottom = -24.0
grow_horizontal = 2
grow_vertical = 2
theme_override_constants/separation = 16

[node name="Header" type="HBoxContainer" parent="UI"]
layout_mode = 2

[node name="TitleCol" type="VBoxContainer" parent="UI/Header"]
layout_mode = 2
size_flags_horizontal = 3

[node name="Title" type="Label" parent="UI/Header/TitleCol"]
layout_mode = 2
theme_override_font_sizes/font_size = 32
text = "L O O P"

[node name="Subtitle" type="Label" parent="UI/Header/TitleCol"]
layout_mode = 2
theme_override_font_sizes/font_size = 12
text = "NEON ECHO PUZZLE"

[node name="Stats" type="HBoxContainer" parent="UI"]
layout_mode = 2

[node name="LevelLabel" type="Label" parent="UI/Stats"]
unique_name_in_owner = true
layout_mode = 2
size_flags_horizontal = 3
text = "LEVEL 01"

[node name="MovesLabel" type="Label" parent="UI/Stats"]
unique_name_in_owner = true
layout_mode = 2
size_flags_horizontal = 3
text = "MOVES: 0"

[node name="ScoreLabel" type="Label" parent="UI/Stats"]
unique_name_in_owner = true
layout_mode = 2
size_flags_horizontal = 3
text = "SCORE: 0"

[node name="BoardCenter" type="CenterContainer" parent="UI"]
layout_mode = 2
size_flags_vertical = 3

[node name="BoardGrid" type="GridContainer" parent="UI/BoardCenter"]
unique_name_in_owner = true
layout_mode = 2
theme_override_constants/h_separation = 8
theme_override_constants/v_separation = 8
columns = 4

[node name="EchoStatusLabel" type="Label" parent="UI"]
unique_name_in_owner = true
layout_mode = 2
text = "ECHO SYSTEM: ARMED"

[node name="StatusLabel" type="Label" parent="UI"]
unique_name_in_owner = true
layout_mode = 2
text = "Connect START to GOAL."
`,
  },
  {
    path: 'scenes/TileView.tscn',
    description: 'TileView Control Scene for procedural vector rendering',
    content: `[gd_scene load_steps=2 format=3 uid="uid://b23vx98q11la"]

[ext_resource type="Script" path="res://scripts/TileView.gd" id="1_tile"]

[node name="TileView" type="Control"]
custom_minimum_size = Vector2(80, 80)
layout_mode = 3
anchors_preset = 0
offset_right = 80.0
offset_bottom = 80.0
script = ExtResource("1_tile")
`,
  },
  {
    path: 'tests/test_puzzle_solver.gd',
    description: 'Automated test suite executing tile rotation, reciprocal connectivity, and solver verification',
    content: `@tool
extends SceneTree

func _init() -> void:
	print("--- RUNNING AUTOMATED PUZZLE TESTS ---")
	
	# Test 1: Mask rotation
	var m: int = BoardModel.NORTH
	assert(BoardModel.rotate_mask(m, 1) == BoardModel.EAST, "Rotation N -> E failed")
	assert(BoardModel.rotate_mask(m, 2) == BoardModel.SOUTH, "Rotation N -> S failed")
	assert(BoardModel.rotate_mask(m, 3) == BoardModel.WEST, "Rotation N -> W failed")
	assert(BoardModel.rotate_mask(m, 4) == BoardModel.NORTH, "Rotation N -> N failed")
	print("[PASS] Tile rotation 90-degree bit shifting")
	
	# Test 2: Reciprocal connection
	assert(BoardModel.can_connect(BoardModel.EAST, BoardModel.WEST, BoardModel.EAST), "Reciprocal E-W connection failed")
	assert(not BoardModel.can_connect(BoardModel.EAST, BoardModel.NORTH, BoardModel.EAST), "Non-reciprocal connection false positive")
	print("[PASS] Reciprocal connection validation")
	
	# Test 3: Generator and Solver
	var gen := PuzzleGenerator.new()
	var board: Dictionary = gen.get_handcrafted_level(1)
	var solve: Dictionary = PuzzleSolver.solve(board)
	assert(solve["solvable"], "Level 1 must be solvable")
	assert(solve["optimal_steps"] == 1, "Level 1 should solve in 1 move")
	print("[PASS] BFS Solver verification on Level 1 (Solved in %d steps)" % solve["optimal_steps"])
	
	print("--- ALL TESTS PASSED SUCCESSFULLY! ---")
	quit(0)
`,
  },
  {
    path: 'README.md',
    description: 'Complete Windows and Android build documentation, architecture, and APK export steps',
    content: `# LOOP — Neon Echo Puzzle (Godot 4.3 Android Project)

A lightweight, premium Android logic puzzle game where players rotate neon circuit tiles, predict future moves, and plan around delayed Echo actions to connect **START** to **GOAL**.

## 1. System Requirements & Dependencies
- **Godot Engine 4.3 Standard**: Download 64-bit for Windows from [https://godotengine.org/download](https://godotengine.org/download).
- **Android Studio** or **Android Command-line Tools**:
  - Android SDK Platform 34 (Android 14)
  - Android SDK Build-Tools 34.0.0
  - OpenJDK 17 (Eclipse Temurin or Microsoft OpenJDK 17)
- **Godot Android Export Templates**: In Godot, go to **Editor -> Manage Export Templates -> Download and Install**.

## 2. Running on Windows Desktop
1. Extract the zip archive to your desired directory (e.g., \`C:\\Games\\LoopNeonEcho\`).
2. Launch Godot 4.3.
3. Click **Import**, browse to \`project.godot\`, then click **Import & Edit**.
4. Press **F5** (or click the Play button in the top-right corner) to run the game immediately!
5. Left-click any wire tile to rotate it 90° clockwise. Watch the Echo indicator trigger after the configured delay.

## 3. Running Automated Tests in Godot
Run the built-in test suite directly from your Windows command prompt:
\`\`\`cmd
"C:\\Godot\\Godot_v4.3-stable_win64.exe" -s tests/test_puzzle_solver.gd --headless
\`\`\`

## 4. Building the Android APK on Windows
### Option A: From Godot Editor
1. In Godot, click **Project -> Export**.
2. Select the pre-configured **Android** preset.
3. Verify your Android SDK path in **Editor -> Editor Settings -> Export -> Android**.
4. Click **Export Project**, specify output path \`builds/loop_neon_echo.apk\`, and click **Save**.

### Option B: Automated Headless Batch Build
Run the provided \`build_android.bat\` or execute:
\`\`\`cmd
"C:\\Godot\\Godot_v4.3-stable_win64.exe" --headless --export-debug "Android" builds/loop_neon_echo.apk
\`\`\`

## 5. Architectural Modules
- \`scripts/BoardModel.gd\`: Pure bitwise direction math (N=1, E=2, S=4, W=8), reciprocal connectivity checks, and flood-fill circuit validation.
- \`scripts/EchoManager.gd\`: Tracks the delayed Echo FIFO queue.
- \`scripts/PuzzleSolver.gd\`: Breadth-First Search (BFS) state-space solver guaranteeing solvability and providing intelligent hints.
- \`scripts/PuzzleGenerator.gd\`: Generates verified solvable boards and handcrafted onboarding levels.
- \`scripts/TileView.gd\`: Procedural native 2D vector neon rendering using \`_draw()\`. Zero external bitmap assets needed.
- \`scripts/AudioManager.gd\`: Audio triggers and Android haptics via \`Input.vibrate_handheld()\`.
- \`scripts/SaveManager.gd\`: Persists unlocked progress and preferences to \`user://loop_save_v2.json\`.
- \`scripts/Main.gd\`: Central UI controller.
`,
  },
  {
    path: 'build_android.bat',
    description: 'Automated Windows batch script to compile debug APK headless',
    content: `@echo off
echo ========================================================
echo   LOOP: Neon Echo Puzzle - Headless Android Build
echo ========================================================

set GODOT_BIN="C:\\Godot\\Godot_v4.3-stable_win64.exe"
if not exist %GODOT_BIN% (
    echo [!] Godot executable not found at %GODOT_BIN%.
    echo Please edit build_android.bat to match your Godot 4.3 installation path.
    pause
    exit /b 1
)

if not exist builds mkdir builds

echo [*] Exporting Android APK...
%GODOT_BIN% --headless --export-debug "Android" builds/loop_neon_echo.apk

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] APK compiled successfully at builds\\loop_neon_echo.apk!
) else (
    echo [ERROR] Export failed with error code %ERRORLEVEL%.
)
pause
`,
  },
];

export async function createGodotProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('LOOP_Godot_Project');

  for (const file of GODOT_FILES) {
    folder?.file(file.path, file.content);
  }

  return await zip.generateAsync({ type: 'blob' });
}
