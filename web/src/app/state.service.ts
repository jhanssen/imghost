import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/Rx';

@Injectable()
export class StateService {
    states: { [key: string]: BehaviorSubject<any> } = {
        refresh: new BehaviorSubject<boolean>(false),
        configuring: new BehaviorSubject<boolean>(false),
        image: new BehaviorSubject<string>(undefined),
        modal: new BehaviorSubject<string>(undefined)
    };

    constructor() { }

    get(key: string) {
        if (key in this.states)
            return this.states[key].asObservable();
        return null;
    }

    set(key: string, value: any) {
        if (key in this.states) {
            this.states[key].next(value);
            return true;
        }
        return false;
    }
}
