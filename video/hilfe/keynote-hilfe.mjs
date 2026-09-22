// Hilfevideos im Keynote-Look (Hochkant 720×1280): je Thema (src/lib/hilfe.mjs) und Plattform ein Video – Cover, Einleitung,
// dann Schritt für Schritt mit Untertitel und Kamera auf das, was gerade passiert. Drehbücher: hilfe-scripts.mjs.
//   node video/hilfe/keynote-hilfe.mjs                alle Themen, alle Plattformen
//   node video/hilfe/keynote-hilfe.mjs 05 ios         nur Thema 05 für iOS (oder: 05 alle / alle ios)
//   DEBUG=1 …                                         nach jedem Schritt ein Bild nach video/hilfe/tmp/kn-*.png
// Danach: python video/hilfe/compose_tour.py 0  (Musik + mp4 nach video/hilfe/out) und python video/hilfe/hilfe-posters.py
import { record, sleep, closeBrowser } from './keynote-lib.mjs';
import { HELP_TOPICS, PLATFORMS, stepsFor, videoName } from '../../src/lib/hilfe.mjs';
import { SCRIPTS } from './hilfe-scripts.mjs';

const [onlyTopic = 'alle', onlyPlat = 'alle'] = process.argv.slice(2);
const PLAT_NAME = { android: 'Android', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' };
const holdFor = text => Math.min(9.5, Math.max(3.8, 2.8 + text.length * 0.052)) * 1000;

const topics = HELP_TOPICS.filter(t => onlyTopic === 'alle' || t.n === onlyTopic || t.id === onlyTopic);
const plats = PLATFORMS.map(p => p[0]).filter(p => onlyPlat === 'alle' || p === onlyPlat);
console.log(`Aufnahme: ${topics.length} Themen × ${plats.length} Plattformen`);
for (const topic of topics) {
  for (const plat of plats) {
    const mode = plat === 'android' || plat === 'ios' ? 'phone' : 'desktop';
    await record({
      name: videoName(topic, plat), rolle: topic.id === 'dokumente' ? 'rat' : 'mitglied', plat, mode, // Thema 10 zeigt „Sitzungen“ – das sehen nur Ratsmitglieder
      script: async S => {
        S.auto = true; // Kamera fährt von selbst auf das Element, das gerade angetippt wird
        const sc = SCRIPTS[topic.id] ? SCRIPTS[topic.id](S) : { start: 'start', steps: [] };
        await S.load(sc.start || 'start', sc.loadOpts || {});
        await S.cover([topic.title], `Hilfe ${topic.n} · ${PLAT_NAME[plat]}`, mode === 'desktop' ? { s: 1, cy: 470, rot: -3 } : {});
        await S.intro(`${topic.group} · ${PLAT_NAME[plat]}`, topic.intro); await sleep(Math.max(2800, holdFor(topic.intro) - 600)); await S.intro('', ''); await sleep(300);
        await S.phone('in'); await sleep(1000); await S.calibrate(S.mobile ? '.mb-tabbar' : '.mb-side');
        if (sc.before) await sc.before();
        const steps = stepsFor(topic, plat);
        for (let i = 0; i < steps.length; i++) {
          await S.caption(i + 1, steps[i]);
          const ta = Date.now();
          const act = sc.steps[i];
          if (act) { try { await act(); } catch (e) { console.log(`  ! ${videoName(topic, plat)} Schritt ${i + 1}:`, e.message.split('\n')[0]); } }
          await sleep(Math.max(1400, holdFor(steps[i]) - (Date.now() - ta)));
          await S.snap(`s${i + 1}`);
        }
        await S.caption(0, ''); await S.overlayOff(); await S.camReset(700); await S.phone('out'); await sleep(600);
        await S.end({ big: 'Fragen?<br>Der Vorstand hilft.', adr: 'spd-soltau.de/mitglieder', sub: `Hilfe & Anleitungen · ${topic.n} ${topic.title}` }); await sleep(3400);
      },
    });
  }
}
await closeBrowser();
console.log('fertig');
