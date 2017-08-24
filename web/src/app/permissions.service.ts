import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Rx';

@Injectable()
export class PermissionsService {
    perms = new Subject<number>();

    constructor() { }

    permissions() {
        return this.perms.asObservable();
    }

    update(perm: number) {
        this.perms.next(perm);
    }
}
