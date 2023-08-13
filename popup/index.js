(async function() {
  const settingsKey = 'com.ajowsentry.chessAnalyzer.settings';

  const port = new window.chessAnalyzer.ContentPort();

  // console.log('{tableForm, identity}');
  await port.sendCommand('initialize');
  let availableOptions = await port.sendCommand('availableOptions');
  let identity = await port.sendCommand('identity');

  let formData = localStorage.getItem(settingsKey);
  if(formData) {
    await Promise.all(JSON.parse(formData).map(i => port.sendCommand('setOption', i.name, i.value)));
  }

  let formHtml = '';
  for(let option of availableOptions) {
    if(option.type == 'string') {
      let defaultValue = option.defaultValue ?? '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td class="p-0">
          <input id="input-${option.key}" type="text" value="${defaultValue}" name="${option.key}" class="form-control border-0 rounded-0">
        </td>
      </tr>`;
    }
    else if(option.type == 'spin') {
      let minAttr = typeof option.minValue !== 'undefined' ? `min="${option.minValue}"` : '';
      let maxAttr = typeof option.maxValue !== 'undefined' ? `max="${option.maxValue}"` : '';
      let defaultValue = option.defaultValue ?? '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td class="p-0">
          <input id="input-${option.key}" type="number" value="${defaultValue}" name="${option.key}" class="form-control border-0 rounded-0" ${minAttr} ${maxAttr}>
        </td>
      </tr>`;
    }
    else if(option.type == 'check') {
      let defaultValue = option.defaultValue ?? false;
      let checkAtt = defaultValue ? 'checked' : '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td>
          <input id="input-${option.key}" type="checkbox" class="form-check-input" name="${option.key}" ${checkAtt}>
        </td>
      </tr>`;
    }
    else if(option.type == 'combo') {
      let defaultValue = option.defaultValue ?? '';
      let optionTags = option.vars.map(v => {
        let selectedAttr = v == defaultValue ? 'selected' : '';
        return `<option ${selectedAttr}>${v}</option>`
      }).join('');
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td class="p-0">
          <select id="input-${option.key}" name="${option.key}" class="form-control border-0 rounded-0">
            ${optionTags}
          </select>
        </td>
      </tr>`;
    }
  }

  $('form table tbody').html(formHtml);
  $('.card-body em').text(identity.name);

  $('form').on('submit', async function(ev) {
    ev.preventDefault();

    let button = $(this).find('button[type="submit"]');
    button.prop('disabled', true);
    button.find('span').removeClass('d-none');
    let settings = Array.from($('form :input[name]')).map(el => 
      ({name: el.name, value: el.type == 'checkbox' ? el.checked : el.value })
    );

    await Promise.all(settings.map(i => port.sendCommand('setOption', i.name, i.value)));
    localStorage.setItem(settingsKey, JSON.stringify(settings));

    button.prop('disabled', false);
    button.find('span').addClass('d-none');
  });
})();
