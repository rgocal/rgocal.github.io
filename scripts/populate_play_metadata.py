import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
projects = json.loads((root / 'projects.json').read_text(encoding='utf-8'))
published = projects.get('Published Applications', [])
metadata = {}

for item in published:
    if not item.get('packageName'):
        continue
    pkg = item['packageName']
    screenshots = []
    if isinstance(item.get('screenshot'), list):
        screenshots = [s for s in item['screenshot'] if s]
    elif item.get('screenshot'):
        screenshots = [item['screenshot']]
    elif isinstance(item.get('screenshots'), list):
        screenshots = [s for s in item['screenshots'] if s]

    metadata[pkg] = {
        'description': item.get('description', ''),
        'image': screenshots[0] if screenshots else '',
        'screenshots': screenshots,
        'title': item.get('label', ''),
        'url': item.get('url') or f"https://play.google.com/store/apps/details?id={pkg}",
        'price': item.get('price', '')
    }

(root / 'play-metadata.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print(json.dumps(metadata, indent=2))
