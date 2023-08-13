(async function() {

  const port = new window.chessAnalyzer.ContentPort();
  const storage = window.chessAnalyzer.Storage;

  await port.sendCommand('initialize');
  let availableOptions = await port.sendCommand('availableOptions');
  let identity = await port.sendCommand('identity');

  await port.sendCommand('setOptions', storage.getOptions());

  let formHtml = '';
  for(let option of availableOptions) {
    if(option.type == 'string') {
      let value = storage.getOption(option.key) ?? option.defaultValue ?? '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td class="p-0">
          <input id="input-${option.key}" type="text" value="${value}" name="${option.key}" class="form-control border-0 rounded-0">
        </td>
      </tr>`;
    }
    else if(option.type == 'spin') {
      let minAttr = typeof option.minValue !== 'undefined' ? `min="${option.minValue}"` : '';
      let maxAttr = typeof option.maxValue !== 'undefined' ? `max="${option.maxValue}"` : '';
      let value = storage.getOption(option.key) ?? option.defaultValue ?? '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td class="p-0">
          <input id="input-${option.key}" type="number" value="${value}" name="${option.key}" class="form-control border-0 rounded-0" ${minAttr} ${maxAttr}>
        </td>
      </tr>`;
    }
    else if(option.type == 'check') {
      let value = storage.getOption(option.key) ?? option.defaultValue ?? false;
      let checkAtt = value ? 'checked' : '';
      formHtml += `<tr>
        <td class="p-0"><label for="input-${option.key}" class="d-block px-3 py-2">${option.key}</label></td>
        <td>
          <input id="input-${option.key}" type="checkbox" class="form-check-input" name="${option.key}" ${checkAtt}>
        </td>
      </tr>`;
    }
    else if(option.type == 'combo') {
      let value = storage.getOption(option.key) ?? option.defaultValue ?? '';
      let optionTags = option.vars.map(v => {
        let selectedAttr = v == value ? 'selected' : '';
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
    let options = Array.from($('form :input[name]')).map(el => 
      ({name: el.name, value: el.type == 'checkbox' ? el.checked : el.value })
    );

    await port.sendCommand('setOptions', options);
    options.forEach(o => storage.setOption(o.name, o.value));
    storage.save();

    button.prop('disabled', false);
    button.find('span').addClass('d-none');
    close();
  });
})();
