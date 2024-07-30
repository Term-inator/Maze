export class Enum {
  constructor(initialValues = {}) {
    this._values = [];

    // 初始化枚举值
    Object.keys(initialValues).forEach(key => {
      this.addEnumValue(key, initialValues[key]);
    });

    return new Proxy(this, {
      set: (target, property, value) => {
        if (property in target && property !== '_values' && property !== 'getValues' && property !== 'addEnumValue' && property !== 'addEnumFromObject') {
          throw new Error(`Cannot modify existing enum value: ${property}`);
        }
        if (target._values.includes(value)) {
          throw new Error(`Value ${value} already exists in enum`);
        }
        target._values.push(value);
        return target[property] = value;
      },
      deleteProperty: (target, property) => {
        throw new Error(`Cannot delete enum value: ${property}`);
      }
    });
  }

  getValues() {
    return this._values;
  }

  addEnumValue(name, value) {
    this[name] = value;
  }

  addEnumFromObject(obj) {
    Object.keys(obj).forEach(key => {
      this.addEnumValue(key, obj[key]);
    });
  }
}
