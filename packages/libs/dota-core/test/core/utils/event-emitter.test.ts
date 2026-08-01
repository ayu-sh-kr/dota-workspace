import {EventEmitter} from "@dota/core";


describe('EventEmitter', () => {
  it('should emit an event with the specified data', () => {
    const eventName = 'testEvent';
    const eventData = {key: 'value'};
    const eventEmitter = new EventEmitter<typeof eventData>(eventName);

    const mockCallback = vi.fn();
    window.addEventListener(eventName, mockCallback);

    eventEmitter.emit(eventData);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0].detail).toEqual(eventData);

    window.removeEventListener(eventName, mockCallback);
  });

  it('should emit an event from the specified root element', () => {
    const eventName = 'testEvent';
    const eventData = {key: 'value'};
    const eventEmitter = new EventEmitter<typeof eventData>(eventName);

    const mockCallback = vi.fn();
    const rootElement = document.createElement('div');
    rootElement.addEventListener(eventName, mockCallback);

    eventEmitter.emit(eventData, rootElement);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0].detail).toEqual(eventData);

    rootElement.removeEventListener(eventName, mockCallback);
  });

  it('should bubble the event up to the window object', () => {
    const eventName = 'testEvent';
    const eventData = {key: 'value'};
    const eventEmitter = new EventEmitter<typeof eventData>(eventName);

    const mockCallback = vi.fn();
    window.addEventListener(eventName, mockCallback);

    const rootElement = document.createElement('div');
    document.body.appendChild(rootElement);

    eventEmitter.emit(eventData, rootElement, true);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0].detail).toEqual(eventData);

    window.removeEventListener(eventName, mockCallback);
    document.body.removeChild(rootElement);
  });

  it('should not bubble the event up to the window object when bubbling is disabled', () => {
    const eventName = 'testEvent';
    const eventData = {key: 'value'};
    const eventEmitter = new EventEmitter<typeof eventData>(eventName);

    const mockCallback = vi.fn();
    window.addEventListener(eventName, mockCallback);

    const rootElement = document.createElement('div');
    document.body.appendChild(rootElement);

    // Emit without bubbling (default)
    eventEmitter.emit(eventData, rootElement);

    expect(mockCallback).not.toHaveBeenCalled();

    window.removeEventListener(eventName, mockCallback);
    document.body.removeChild(rootElement);
  });

  it('should emit correct event when passed with options object instead of just bubble boolean', () => {
    const eventName = 'testEvent';
    const eventData = {key: 'value'};
    const eventEmitter = new EventEmitter<typeof eventData>(eventName);

    const mockCallback = vi.fn();
    window.addEventListener(eventName, mockCallback);

    const rootElement = document.createElement('div');
    document.body.appendChild(rootElement);

    // Emit with event options object
    eventEmitter.emit(eventData, rootElement, {bubbles: true, cancelable: true, composed: false});

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback.mock.calls[0][0].detail).toEqual(eventData);
    expect(mockCallback.mock.calls[0][0].bubbles).toBe(true);
    expect(mockCallback.mock.calls[0][0].cancelable).toBe(true);
    expect(mockCallback.mock.calls[0][0].composed).toBe(false);

    window.removeEventListener(eventName, mockCallback);
    document.body.removeChild(rootElement);
  });


});