import { PANEL_ID, STYLE_ID } from './constants';
import { sendBark } from './send-bark';
import { loadSettings, parseBarkKey, readForm, saveSettings } from './settings';

function injectStyle(): void {
  $(`#${STYLE_ID}`).remove();
  const css = `
#${PANEL_ID} { display: block; margin: 0; padding: 0; }
#${PANEL_ID} .inline-drawer-content { padding: 0.5em 0.75em; margin: 0; }
#${PANEL_ID} .bn-body { display: block; padding: 0; margin: 0; }
#${PANEL_ID} .bn-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 4px; align-items: flex-end; }
#${PANEL_ID} .bn-field { display: block; flex: 1 1 200px; min-width: 0; margin: 0; }
#${PANEL_ID} .bn-field--full { flex: 1 1 100%; margin: 0 0 4px; }
#${PANEL_ID} .bn-label { display: block; font-size: 0.95em; opacity: 0.85; margin: 0 0 2px; line-height: 1.2; }
#${PANEL_ID} .text_pole { width: 100%; box-sizing: border-box; margin: 0; padding: 4px 6px; min-height: unset; }
#${PANEL_ID} select.text_pole { margin: 0; padding: 4px 6px; }
#${PANEL_ID} .checkbox_label { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; line-height: 1.2; }
#${PANEL_ID} .bn-actions {
  display: flex; flex-direction: row; flex-wrap: nowrap; gap: 8px;
  align-items: center; margin: 6px 0 0; width: 100%;
}
#${PANEL_ID} .bn-actions .menu_button {
  display: inline-flex !important; flex-direction: row !important; flex: 0 0 auto !important;
  align-items: center; justify-content: center; white-space: nowrap !important;
  width: auto !important; min-width: 88px; padding: 6px 14px !important;
  writing-mode: horizontal-tb !important; -webkit-writing-mode: horizontal-tb !important;
}
#${PANEL_ID} #bn-status {
  display: block; margin-top: 6px; padding: 6px 10px; border-radius: 6px;
  font-size: 0.95em; line-height: 1.35; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(0,0,0,0.2);
}
#${PANEL_ID} #bn-status:empty { display: none; }
#${PANEL_ID} #bn-status.is-ok { border-color: rgba(46,204,113,0.5); color: #6ee7a0; background: rgba(46,204,113,0.12); }
#${PANEL_ID} #bn-status.is-err { border-color: rgba(231,76,60,0.5); color: #f1948a; background: rgba(231,76,60,0.12); }
#${PANEL_ID} #bn-status.is-wait { border-color: rgba(52,152,219,0.5); color: #85c1e9; background: rgba(52,152,219,0.12); }
#${PANEL_ID} .menu_button.bn-test { background: #e94560 !important; border-color: #e94560 !important; color: #fff !important; }
#${PANEL_ID} .menu_button.disabled { opacity: 0.55; pointer-events: none; }
`.trim();
  $('<style>').attr('id', STYLE_ID).text(css).appendTo('head');
}

function setStatus(text: string, kind: 'ok' | 'err' | 'wait' | ''): void {
  const el = document.querySelector(`#${PANEL_ID} #bn-status`) || document.getElementById('bn-status');
  if (!el) return;
  el.textContent = text;
  el.className = kind ? `is-${kind}` : '';
}

function toast(kind: 'ok' | 'err' | 'info', msg: string): void {
  try {
    if (kind === 'ok') toastr.success(msg, 'Bark通知');
    else if (kind === 'err') toastr.error(msg, 'Bark通知');
    else toastr.info(msg, 'Bark通知');
  } catch {
    console.log('[Bark通知]', msg);
  }
}

function bindUiEvents($root: JQuery<HTMLElement>): void {
  $root.on('click', '#bn-save', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const form = readForm($root);
    if (!form.barkKey) {
      setStatus('❌ 请填写 Bark Key', 'err');
      toast('err', '未读到 Bark Key');
      return;
    }
    saveSettings(form);
    setStatus(
      `✅ 已保存（>截断: ${form.truncatedIfNoGreaterThanEnd ? '开' : '关'}）Key: ${form.barkKey.slice(0, 6)}…`,
      'ok',
    );
    toast('ok', 'Bark 设置已保存');
  });

  $root.on('click', '#bn-test', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $btn = $(this);
    if ($btn.data('busy')) return;
    const form = readForm($root);
    if (!form.barkKey) {
      setStatus('❌ 请先填 Bark Key', 'err');
      return;
    }
    saveSettings(form);
    setStatus('⏳ 正在发送测试推送…', 'wait');
    $btn.data('busy', true).addClass('disabled').text('发送中…');
    try {
      const result = await sendBark('测试推送：酒馆 Bark 通知配置成功 🎉', form);
      setStatus(`✅ ${result.msg}`, result.ok ? 'ok' : 'err');
      toast(result.ok ? 'ok' : 'err', result.msg);
    } finally {
      $btn.data('busy', false).removeClass('disabled').text('测试推送');
    }
  });

  $root.on('blur', '#bn-key', function () {
    const key = parseBarkKey($(this).val() as string);
    if (key) $(this).val(key);
  });

  $root.on('change', '#bn-enabled, #bn-trunc-no-gt, #bn-level, #bn-min-tokens', () => {
    const form = readForm($root);
    saveSettings(form);
    setStatus(`设置已保存（>截断: ${form.truncatedIfNoGreaterThanEnd ? '开' : '关'}）`, 'ok');
  });
}

export function focusExtensionsSettings(): void {
  const el = document.getElementById(PANEL_ID);
  if (!el) return;
  $('#extensions').trigger('click');
  const $content = $(el).find('.inline-drawer-content');
  if ($content.length && !$content.is(':visible')) {
    $(el).find('.inline-drawer-toggle').trigger('click');
  }
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
}

export function mountUI(): void {
  const $target = $('#extensions_settings2');
  if (!$target.length) {
    setTimeout(mountUI, 400);
    return;
  }
  $(`#${PANEL_ID}`).remove();
  injectStyle();

  const s = loadSettings();
  const scriptId = typeof getScriptId === 'function' ? getScriptId() : 'bark-notify';

  const html = `
<div id="${PANEL_ID}" script_id="${scriptId}" class="inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>Bark 空回/截断通知</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content">
    <div class="bn-body">
      <div class="bn-row">
        <label class="checkbox_label bn-field bn-field--full">
          <input id="bn-enabled" type="checkbox" ${s.enabled ? 'checked' : ''}>
          <span>启用空回与截断通知</span>
        </label>
      </div>
      <div class="bn-row">
        <label class="checkbox_label bn-field bn-field--full">
          <input id="bn-trunc-no-gt" type="checkbox" ${s.truncatedIfNoGreaterThanEnd !== false ? 'checked' : ''}>
          <span>未以 &gt; 结尾时视为截断</span>
        </label>
      </div>
      <div class="bn-row">
        <div class="bn-field">
          <label class="bn-label" for="bn-level">通知级别</label>
          <select id="bn-level" class="text_pole">
            <option value="passive" ${s.level === 'passive' ? 'selected' : ''}>passive（静默）</option>
            <option value="active" ${s.level === 'active' ? 'selected' : ''}>active（普通）</option>
            <option value="timeSensitive" ${s.level === 'timeSensitive' ? 'selected' : ''}>timeSensitive（推荐）</option>
          </select>
        </div>
      </div>
      <div class="bn-field bn-field--full">
        <label class="bn-label" for="bn-key">Bark Key</label>
        <input id="bn-key" class="text_pole" type="text" placeholder="https://api.day.app/xxxxxxxxxxxx/" value="">
      </div>
      <div class="bn-field bn-field--full">
        <label class="bn-label" for="bn-server">Bark 服务器</label>
        <input id="bn-server" class="text_pole" type="text" placeholder="https://api.day.app" value="">
      </div>
      <div class="bn-row">
        <div class="bn-field">
          <label class="bn-label" for="bn-title">通知标题</label>
          <input id="bn-title" class="text_pole" type="text" value="">
        </div>
        <div class="bn-field">
          <label class="bn-label" for="bn-empty">通知内容</label>
          <input id="bn-empty" class="text_pole" type="text" value="">
        </div>
        <div class="bn-field">
          <label class="bn-label" for="bn-min-tokens">截断阈值 (token)</label>
          <input id="bn-min-tokens" class="text_pole" type="number" min="1" step="1" value="">
        </div>
      </div>
      <div class="bn-actions">
        <div id="bn-save" class="menu_button">保存设置</div>
        <div id="bn-test" class="menu_button bn-test">测试推送</div>
      </div>
      <div id="bn-status"></div>
    </div>
  </div>
</div>`;

  const $root = $(html);
  $root.find('#bn-key').val(s.barkKey);
  $root.find('#bn-server').val(s.barkServer);
  $root.find('#bn-title').val(s.title);
  $root.find('#bn-empty').val(s.emptyMsg);
  $root.find('#bn-min-tokens').val(s.minTokens);
  $root.appendTo($target);
  bindUiEvents($root);
}

export function teardownUI(): void {
  $(`#${PANEL_ID}`).remove();
  $(`#${STYLE_ID}`).remove();
}
