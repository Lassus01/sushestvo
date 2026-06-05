shader_type canvas_item;

uniform float amount : hint_range(0.0, 1.0) = 0.05;
uniform float time_speed : hint_range(0.0, 10.0) = 2.0;

// Random function
float random(vec2 uv) {
    return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void fragment() {
    vec2 uv = UV;

    // Add time-based randomness
    float time_val = floor(TIME * time_speed * 10.0);

    // Create strips
    float strips = floor(uv.y * 20.0);

    // Generate an offset based on random strips
    float offset = (random(vec2(strips, time_val)) - 0.5) * amount;

    // Apply offset only to a few strips randomly
    if (random(vec2(strips + 1.0, time_val)) > 0.8) {
        uv.x += offset;
    }

    vec4 color = texture(TEXTURE, uv);

    // Add chromatic aberration
    if (amount > 0.0) {
        float r = texture(TEXTURE, vec2(uv.x + amount * 0.5, uv.y)).r;
        float b = texture(TEXTURE, vec2(uv.x - amount * 0.5, uv.y)).b;
        color.r = r;
        color.b = b;
    }

    COLOR = color;
}
