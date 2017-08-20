import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/Rx';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
    constructor(private http: Http) { }

    get(path) {
        const baseurl = window.location.protocol + "//" + window.location.host + "/api/v1"
        return this.http.get(baseurl + path).map((res: Response) => {
            if (res.status < 200 || res.status >= 300)
                return { status: status, error: true };
            return res.json();
        }).catch((err: HttpErrorResponse) => {
            const subject = new BehaviorSubject({ status: err.status, error: true });
            return subject.asObservable();
        });
    }
}
