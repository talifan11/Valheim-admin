from pathlib import Path
p = Path("src/screens/Mods.tsx")
text = p.read_text(encoding="utf-8")

# 1. Бейдж "Обязательный" + "N откл." рядом с именем мода
old1 = '''                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-200 truncate">
                              {mod.name}
                            </span>
                            {mod.disabled && (
                              <StatusPill tone="slate">выкл</StatusPill>
                            )}
                          </div>'''

new1 = '''                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-slate-200 truncate">
                              {mod.name}
                            </span>
                            {mod.disabled && (
                              <StatusPill tone="slate">выкл</StatusPill>
                            )}
                            {(() => {
                              const m = getMetaFor(mod.name);
                              if (!m) return null;
                              return (
                                <>
                                  {m.mandatory && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gold/10 border border-gold/25 text-gold text-[9px] font-bold uppercase tracking-wider">
                                      <Crown size={9} /> Обязательный
                                    </span>
                                  )}
                                  {!m.mandatory && m.disabled_by_users > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-500 text-[9px] font-bold">
                                      {m.disabled_by_users} откл.
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>'''

if 'Обязательный' in text:
    print("SKIP: бейдж уже есть")
elif old1 in text:
    text = text.replace(old1, new1, 1)
    print("OK: бейдж Обязательный + счётчик")
else:
    print("ПРОПУСК 1: не нашёл блок имени")

# 2. Кнопка Crown перед Trash
old2 = '''                          <button
                            type="button"
                            onClick={() => handleDelete(mod)}
                            disabled={busyFile === mod.filename}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                            title="Удалить"
                          >
                            <Trash2 size={12} />
                          </button>'''

new2 = '''                          {(() => {
                            const m = getMetaFor(mod.name);
                            if (!m) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleMandatory(m.name, m.mandatory)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  m.mandatory
                                    ? 'text-gold bg-gold/10 hover:bg-gold/20'
                                    : 'text-slate-500 hover:text-gold hover:bg-gold/10'
                                }`}
                                title={m.mandatory ? 'Снять обязательность' : 'Сделать обязательным'}
                              >
                                <Crown size={12} />
                              </button>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => handleDelete(mod)}
                            disabled={busyFile === mod.filename}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-blood hover:bg-blood/10 transition-colors disabled:opacity-40"
                            title="Удалить"
                          >
                            <Trash2 size={12} />
                          </button>'''

if 'handleToggleMandatory(m.name' in text:
    print("SKIP: кнопка уже есть")
elif old2 in text:
    text = text.replace(old2, new2, 1)
    print("OK: кнопка Crown добавлена")
else:
    print("ПРОПУСК 2: не нашёл кнопку удаления")

p.write_text(text, encoding="utf-8")
print("Готово")
