// import { useState } from 'react';
// import { useEngine } from '../../hooks/useEngine.js';
// import { STEP_DEFS } from '../../data/constants.js';
// import PipelineStep from './PipelineStep.jsx';
// import './Pipeline.css';
//
// export default function Pipeline() {
//
//   const engine = useEngine();
//   console.log("ENGINE OBJECT:", engine);
//   console.log("ENGINE CONSTRUCTOR:", engine?.constructor?.name);
//   console.log("ENGINE COUNTS:", engine?.counts);
//   console.log("ENGINE COUNTS TYPE:", typeof engine?.counts);
//   const [openKeys, setOpenKeys] = useState(() => new Set());
//
//   const count1 = engine.counts().ready;
//
//   const toggle = (key) =>
//     setOpenKeys((prev) => {
//       const next = new Set(prev);
//       next.has(key) ? next.delete(key) : next.add(key);
//       return next;
//     });
//
//   return (
//     <section className="panel pipeline" aria-labelledby="pipe-h">
//       <div className="panel__head">
//         <h2 id="pipe-h">What happens after you upload</h2>
//         <span className="panel__aside">{engine.aside}</span>
//       </div>
//
//       <ol className="pipeline__list">
//         {STEP_DEFS.map((def, i) => (
//           <PipelineStep
//             key={def.key}
//             def={def}
//             index={i}
//             count = {count1}
//             isLast={i === STEP_DEFS.length - 1}
//             prevState={
//               i > 0
//                 ? engine.steps[STEP_DEFS[i - 1].key].state
//                 : null
//             }
//             open={openKeys.has(def.key)}
//             onToggle={() => toggle(def.key)}
//           />
//         ))}
//       </ol>
//     </section>
//   );
// }

import { useState } from 'react';
import { useEngine } from '../../hooks/useEngine.js';
import { STEP_DEFS } from '../../data/constants.js';
import PipelineStep from './PipelineStep.jsx';
import './Pipeline.css';

export default function Pipeline() {
  const engine = useEngine();
  const [openKeys, setOpenKeys] = useState(() => new Set());

  // counts() lives on the Engine instance; stay safe if a plain snapshot is returned
  const readyCount = engine.counts?.().ready ?? 0;

  const toggle = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <section className="panel pipeline" aria-labelledby="pipe-h">
      <div className="panel__head">
        <h2 id="pipe-h">What happens after you upload</h2>
        <span className="panel__aside">{engine.aside}</span>
      </div>

      <ol className="pipeline__list">
        {STEP_DEFS.map((def, i) => (
          <PipelineStep
            key={def.key}
            def={def}
            index={i}
            count={readyCount}
            isLast={i === STEP_DEFS.length - 1}
            prevState={i > 0 ? engine.steps[STEP_DEFS[i - 1].key]?.state : null}
            open={openKeys.has(def.key)}
            onToggle={() => toggle(def.key)}
          />
        ))}
      </ol>
    </section>
  );
}