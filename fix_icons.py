import re
import sys

file_path = r'd:\loveable_app\react-to-android\pages\ChatPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

icons = ['ArrowLeft', 'Phone', 'Video', 'MoreVertical', 'ImageIcon', 'Camera', 'Mic', 'Send', 'Lock', 'ShieldCheck', 'Film', 'Gamepad2', 'X', 'Smile', 'Reply', 'Play', 'Pause', 'Trash2', 'Fingerprint']
icon_names_pattern = '|'.join(icons)

def replacer(match):
    icon_name = match.group(1)
    class_name_content = match.group(2)
    
    # Defaults
    size = 24
    color = '"currentColor"'
    
    if 'w-3' in class_name_content: size = 12
    elif 'w-4' in class_name_content: size = 16
    elif 'w-5' in class_name_content: size = 20
    elif 'w-6' in class_name_content: size = 24
    elif 'w-8' in class_name_content: size = 32

    if 'text-gray-700' in class_name_content: color = '"#374151"'
    elif 'text-gray-500' in class_name_content: color = '"#6B7280"'
    elif 'text-gray-400' in class_name_content: color = '"#9CA3AF"'
    elif 'text-red-600' in class_name_content: color = '"#DC2626"'
    elif 'text-green-600' in class_name_content: color = '"#16A34A"'
    elif 'text-blue-600' in class_name_content: color = '"#2563EB"'
    elif 'text-indigo-500' in class_name_content: color = '"#6366F1"'
    elif 'text-blue-700' in class_name_content: color = '"#1D4ED8"'
    elif 'text-purple-700' in class_name_content: color = '"#7E22CE"'
    
    props = f'size={{{size}}} color={{color}}'
    if color != '"currentColor"':
        props = f'size={{{size}}} color={color}'
    else:
        # Default fallback or remove color prop
        props = f'size={{{size}}} color={color}'
        
    return f'<{icon_name} {props}'

# Replace static className
content = re.sub(r'<(' + icon_names_pattern + r')\s+className="([^"]+)"', replacer, content)
# Replace dynamic className
content = re.sub(r'<(' + icon_names_pattern + r')\s+className=\{`([^`]+)`\}', replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
