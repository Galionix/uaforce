"""Materialize the pre-effects renderer for the silent browser comparison fixture."""
from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parents[1]
source=subprocess.check_output(['git','show','1f3b52d:reboot/src/game/view.ts'],cwd=root,text=True)
source=re.sub(r"from '(?:\./)([^']+)'",r"from '/src/game/\1'",source)
path=root/'docs/evidence/atmosphere/view-baseline.ts';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(source)
print(path)
