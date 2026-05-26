import { IFRAME_NAME } from './constants';
import { defaultSettings, loadSettings, type Settings } from './settings';

function ensureIframe(): void {
  if (!document.querySelector(`iframe[name="${IFRAME_NAME}"]`)) {
    $('<iframe>')
      .attr({ name: IFRAME_NAME, id: 'bark-notify-iframe' })
      .css({ position: 'absolute', width: 0, height: 0, border: 0, visibility: 'hidden' })
      .appendTo('body');
  }
}

function postViaHiddenForm(url: string, fields: Record<string, string>): Promise<void> {
  ensureIframe();
  return new Promise(resolve => {
    const $form = $('<form>')
      .attr({ method: 'POST', action: url, target: IFRAME_NAME })
      .css('display', 'none');
    Object.entries(fields).forEach(([k, v]) => {
      $form.append($('<input>').attr({ type: 'hidden', name: k, value: String(v) }));
    });
    $('body').append($form);
    ($form[0] as HTMLFormElement).submit();
    setTimeout(() => {
      $form.remove();
      resolve();
    }, 600);
  });
}

export async function sendBark(
  message: string,
  override?: Partial<Settings>,
): Promise<{ ok: boolean; msg: string }> {
  const s = { ...loadSettings(), ...(override ?? {}) };
  const key = (s.barkKey || '').trim();
  if (!key) return { ok: false, msg: '请先填写 Bark Key' };

  const server = (s.barkServer || defaultSettings.barkServer).replace(/\/$/, '');
  await postViaHiddenForm(`${server}/${key}`, {
    title: s.title || defaultSettings.title,
    body: message,
    level: s.level || 'timeSensitive',
    sound: s.sound || 'default',
  });
  return { ok: true, msg: '推送已发出' };
}
