(function() {

  const storageKey = 'com.ajowsentry.chessAnalyzer.storage';

  let storage = { };
  if(localStorage.getItem(storageKey)) {
    storage = JSON.parse(localStorage.getItem(storageKey));
  }

  class Storage {

    #data = { };

    constructor() {
      if(localStorage.getItem(storageKey)) {
        this.#data = JSON.parse(localStorage.getItem(storageKey));
      }
    }

    getOption(name) {
      if(typeof this.#data.options === 'undefined')
        return null;
      
      let option = this.#data.options.find(i => i.name == name);
      if(typeof option === 'undefined')
        return null;
      
      return option.value;
    }

    getOptions() {
      return typeof this.#data.options !== 'undefined' ? this.#data.options : [];
    }

    setOption(name, value) {
      if(typeof this.#data.options === 'undefined')
        this.#data.options = [];

      let option = this.#data.options.find(i => i.name == name);
      if(typeof option === 'undefined')
        this.#data.options.push({name, value});

      else option.value = value;
    }

    save() {
      localStorage.setItem(storageKey, JSON.stringify(this.#data));
    }
  }
  
  const _storage = new Storage();

  if(typeof module !== 'undefined')
    module.exports = { Storage: _storage };

  if(typeof window !== 'undefined') {
    
    if(typeof window.chessAnalyzer === 'undefined')
      window.chessAnalyzer = { };

    if(typeof window.chessAnalyzer.Storage === 'undefined')
      window.chessAnalyzer.Storage = _storage;
  }
})();