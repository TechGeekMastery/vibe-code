# Remove stray backslashes before quote characters in every string of the given chapters (raw-string artifacts that render as a visible backslash).
import json, sys
def fix(x):
    if isinstance(x, str): return x.replace('\\"', '"').replace("\\'", "'")
    if isinstance(x, list): return [fix(v) for v in x]
    if isinstance(x, dict): return {k: fix(v) for k, v in x.items()}
    return x
for key in sys.argv[1:]:
    p = f'content/topics/{key}.json'
    o = json.load(open(p, encoding='utf-8')); n = fix(o)
    if n != o: json.dump(n, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); print('fixed', key)
