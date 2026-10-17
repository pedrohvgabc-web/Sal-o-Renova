from pathlib import Path
p=Path('/home/ubuntu/arena-viva/client/src/index.css')
s=p.read_text()
needle='.appointment-delete:hover{color:#b36047}'
if '.appointment-bianca' not in s:
    s=s.replace(needle, needle+'; .appointment-bianca{opacity:.48;border-left-color:#9c9c9c;filter:saturate(.72)} .appointment-bianca:hover{opacity:.68} .appointment-professional{display:block;color:#8d7668;font-size:10px;margin-top:3px;letter-spacing:.04em}')
p.write_text(s)
