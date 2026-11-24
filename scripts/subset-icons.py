import re, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools import subset

src = 'node_modules/material-symbols/material-symbols-outlined.woff2'
font = TTFont(src)
# ligature name -> glyph
cmap = {v: k for k, v in font.getBestCmap().items()}  # glyph -> codepoint
rev = {g: chr(c) for c, g in font.getBestCmap().items()}
names = {}
for lookup in font['GSUB'].table.LookupList.Lookup:
    for st in lookup.SubTable:
        st = getattr(st, 'ExtSubTable', st)
        if not hasattr(st, 'ligatures'):
            continue
        for first, ligs in st.ligatures.items():
            for lig in ligs:
                seq = [first] + list(lig.Component)
                try:
                    word = ''.join(rev[g] for g in seq)
                except KeyError:
                    continue
                names[word] = lig.LigGlyph
print('icons in font:', len(names))

# every lowercase token in the app's source that is also an icon name
tokens = set()
for p in list(pathlib.Path('src').rglob('*.ts')) + list(pathlib.Path('src').rglob('*.html')):
    tokens |= set(re.findall(r'\b[a-z][a-z0-9_]{1,40}\b', p.read_text(errors='ignore')))
used = sorted(t for t in tokens if t in names)
print('icons kept:', len(used))
pathlib.Path('/tmp/icons-kept.txt').write_text('\n'.join(used))

letters = set('abcdefghijklmnopqrstuvwxyz0123456789_')
glyphs = {g for g, ch in rev.items() if ch in letters} | {names[u] for u in used} | {'.notdef'}
opts = subset.Options()
opts.flavor = 'woff2'
opts.layout_closure = False
opts.layout_features = ['*']
opts.name_IDs = ['*']
opts.notdef_outline = True
opts.glyph_names = False
s = subset.Subsetter(opts)
s.populate(glyphs=sorted(glyphs))
s.subset(font)
out = 'src/assets-fonts/material-symbols-kibabu.woff2'
pathlib.Path('src/assets-fonts').mkdir(exist_ok=True)
font.flavor = 'woff2'
font.save(out)
print('saved', out, pathlib.Path(out).stat().st_size, 'bytes')
