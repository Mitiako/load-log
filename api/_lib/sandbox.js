// api/_lib/sandbox.js
// Виконує JS-код, згенерований AI Assistant'ом, у ІЗОЛЬОВАНОМУ контексті
// Node vm — гарантує математично ТОЧНИЙ результат замість того щоб
// модель рахувала суми/середні "в умі" текстом, де вона неодноразово
// помилялась (підтверджено кількома реальними тестами).
//
// МЕЖІ БЕЗПЕКИ — чесно: Node vm дає СВІЖИЙ глобальний контекст (немає
// process/require/fetch/мережі за замовчуванням) і timeout проти
// нескінченних циклів — цього достатньо проти ВИПАДКОВИХ багів від
// добре проінструктованої LLM під нашим власним промптом. Це НЕ
// повноцінна security-пісочниця проти навмисно ворожого коду (сам
// Node документує vm як недостатній для цього) — якщо колись
// знадобиться захист від навмисно шкідливого коду (наприклад,
// дозволити довільний код від САМОГО водія, не від LLM під нашим
// промптом) — треба перейти на isolated-vm чи окремий процес/контейнер.
import vm from "node:vm";

/**
 * @param {string} code - JS-код, що закінчується return-виразом
 * @param {object} data - те саме, що повертає getAppData() ({loads, profile, summary})
 */
export function runSandboxedCalculation(code, data) {
  const context = vm.createContext({ data });
  const wrapped = `"use strict";\n(function() {\n${code}\n})()`;

  try {
    const script = new vm.Script(wrapped, { timeout: 2000 });
    const result = script.runInContext(context, { timeout: 2000 });
    return { success: true, result: result === undefined ? null : result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
