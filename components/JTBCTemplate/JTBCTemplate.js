export default class JTBCTemplate extends HTMLTemplateElement {
  static get observedAttributes() {
    return ['data', 'mode', 'target'];
  };

  set data(data) {
    let currentData = data;
    if (typeof currentData == 'string') currentData = JSON.parse(currentData);
    if (typeof currentData != 'object') currentData = {};
    if (JSON.stringify(this.currentData) != JSON.stringify(currentData))
    {
      this.currentData = currentData;
      this.update();
    };
  };

  set mode(mode) {
    if (this.currentMode != mode) this.currentMode = mode;
  };

  set target(target) {
    if (this.currentTarget != target) this.currentTarget = target;
  };

  get data() {
    var that = this;
    const addProxy = (obj, flag = false) => {
      const addProxy = obj => {
        return new Proxy(obj, {
          get(target, key) {
            return Reflect.get(target, key);
          },
          set(target, key, value) {
            let reflectSet = Reflect.set(target, key, value);
            if (flag == true && !(Array.isArray(target) && key == 'length')) that.update();
            return reflectSet;
          }
        });
      };
      const addProxies = (proxy, obj, key) => {
        Object.keys(obj).forEach(key => {
          let value = obj[key];
          if(typeof value == 'object')
          {
            proxy[key] = addProxy(value);
            addProxies(proxy[key], value ,key);
          };
        });
      };
      let proxy = addProxy(obj);
      addProxies(proxy, obj);
      flag = true;
      return proxy;
    };
    return addProxy(this.currentData);
  };

  get rawData() {
    return this.currentData;
  };

  get mode() {
    return this.currentMode;
  };

  get target() {
    return this.currentTarget;
  };

  get version() {
    return '1.0.0.0';
  };

  attributeChangedCallback(attr, oldVal, newVal) {
    switch(attr) {
      case 'data':
      {
        this.data = newVal;
        break;
      };
      case 'mode':
      {
        this.mode = newVal;
        break;
      };
      case 'target':
      {
        this.target = newVal;
        break;
      };
    };
  };

  disconnectedCallback() {
    let customEvent = new CustomEvent('done');
    customEvent.myParentNode = this.myParentNode;
    this.dispatchEvent(customEvent);
  };

  update() {
    let currentDataStringify = JSON.stringify(this.currentData);
    this.setAttribute('data', currentDataStringify);
    switch(this.mode) {
      case 'standard':
      {
        this.render();
        break;
      };
      case 'target':
      {
        if (this.target != '')
        {
          document.querySelectorAll(this.target).forEach(el => {
            let thisContent = document.importNode(this.content, true);
            thisContent.querySelectorAll('template').forEach(elc => {
              if (elc.hasAttribute('inherit')) elc.setAttribute('data', currentDataStringify);
            });
            el.innerHTML = '';
            el.append(thisContent);
          });
        };
      };
    };
  };

  render() {
    let data = this.rawData;
    if (Object.keys(data).length != 0)
    {
      this.temporary = [];
      let eIndex = 0;
      let tempElement = document.createElement('element');
      tempElement.append(this.content);
      tempElement.querySelectorAll('template').forEach(el => {
        if (el.hasAttribute('is'))
        {
          eIndex += 1;
          let currentIs = el.getAttribute('is');
          if (currentIs == 'jtbc-template')
          {
            if (el.hasAttribute('key'))
            {
              let currentKeyData = data;
              let currentKey = el.getAttribute('key');
              currentKey.split('.').forEach((item) => { currentKeyData = currentKeyData.hasOwnProperty(item)? currentKeyData[item]: {}; });
              el.setAttribute('data', JSON.stringify(currentKeyData));
            };
            let temporary = document.createElement('temporary');
            temporary.setAttribute('e-index', eIndex);
            el.replaceWith(temporary);
            this.temporary[eIndex] = el;
          };
        };
      });
      let contentHTML = tempElement.innerHTML;
      let documentRange = document.createRange();
      let documentFragment = document.createDocumentFragment();
      const htmlEncode = str => str.replace(/[&<>"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[tag] || tag));
      const itemRender = item => {
        let keysArray = Object.keys(item);
        keysArray.push('$raw');
        keysArray.push('return `' + contentHTML + '`;');
        let valuesArray = Object.values(item);
        valuesArray = valuesArray.map((value) => { return typeof value == 'string'? htmlEncode(value): value; });
        valuesArray.push(item);
        let itemTrigger = new Function(...keysArray);
        let contextualFragment = documentRange.createContextualFragment(itemTrigger(...valuesArray));
        documentFragment.append(contextualFragment);
      };
      if (!Array.isArray(data)) itemRender(data);
      else data.forEach(item => { itemRender(item); });
      documentFragment.querySelectorAll('temporary').forEach(el => {
        el.replaceWith(this.temporary[el.getAttribute('e-index')]);
      });
      this.replaceWith(documentFragment);
    };
  };

  constructor() {
    super();
    this.temporary = [];
    this.currentData = {};
    this.currentMode = 'standard';
    this.currentTarget = '';
    this.myParentNode = this.parentNode;
  };
};