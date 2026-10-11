from pathlib import Path

p = Path("src/screens/Mods.tsx")
text = p.read_text(encoding="utf-8")

# 1. Импорт — добавить Crown (для обязательного) + Lock
if 'Crown' not in text.split('\n')[0:20][0]:
    import re
    m = re.search(r"import \{([^}]+)\} from 'lucide-react'", text)
    if m:
        new_imports = m.group(1).rstrip().rstrip(',') + ", Crown, Lock "
        text = text.replace(m.group(0), f"import {{{new_imports}}} from 'lucide-react'")
        print("OK: импорт Crown, Lock")

# 2. State для meta
if 'modsMeta' not in text:
    old_st = "  const [data, setData] = useState<api.ModsList | null>(null);"
    new_st = """  const [data, setData] = useState<api.ModsList | null>(null);
  const [meta, setMeta] = useState<api.ModMeta[]>([]);"""
    if old_st in text:
        text = text.replace(old_st, new_st, 1)
        print("OK: state meta")

# 3. Загрузка meta
if 'getAdminModsMeta' not in text:
    old_load = """    try {
      const res = await api.getModsList(token);
      setData(res);
    } catch (err) {"""
    new_load = """    try {
      const [res, m] = await Promise.all([
        api.getModsList(token),
        api.getAdminModsMeta(token),
      ]);
      setData(res);
      setMeta(m);
    } catch (err) {"""
    if old_load in text:
        text = text.replace(old_load, new_load, 1)
        print("OK: загрузка meta")

# 4. Хелпер получения меты по имени
if 'getMetaFor' not in text:
    old_hook = "  const pluginsEnabled = data?.plugins.filter((p) => !p.disabled).length ?? 0;"
    new_hook = """  const getMetaFor = (name: string): api.ModMeta | undefined =>
    meta.find((m) => m.name === name.replace(/\.dll$/, ''));

  const handleToggleMandatory = async (modName: string, current: boolean) => {
    if (!token) return;
    try {
      await api.updateModMeta(token, modName, { mandatory: !current });
      const fresh = await api.getAdminModsMeta(token);
      setMeta(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const pluginsEnabled = data?.plugins.filter((p) => !p.disabled).length ?? 0;"""
    if old_hook in text:
        text = text.replace(old_hook, new_hook, 1)
        print("OK: хелпер getMetaFor + handleToggleMandatory")

p.write_text(text, encoding="utf-8")
print("Готово")
