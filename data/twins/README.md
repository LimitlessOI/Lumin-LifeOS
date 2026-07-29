<!-- SYNOPSIS: Digital Twins (data) -->

# Digital Twins (data)

**Template law:** `docs/products/life-coaching/twins/DIGITAL_TWIN_TEMPLATE.md`  
**Machine schema:** `config/digital-twin-template-v1.json`  
**Blank copy:** `_template/`  
**Reference fill:** `default/adam/` (Adam Hopkins — status `review`, needs founder supervision)

## Quick start for a new person

```bash
cp -R data/twins/_template data/twins/default/<user_id>
# edit _meta.json user_id + display_name
# fill facets using docs/products/life-coaching/twins/TWIN_ASSEMBLY_PLAYBOOK.md
```

## Rules

- Do not invent personal facts.
- Propose updates; founder/user reviews before flipping `_meta.status` to `active`.
- Digests over raw megabyte pastes.
