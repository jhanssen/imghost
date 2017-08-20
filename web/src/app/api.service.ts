import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs/Rx';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
    constructor(private http: Http) { }

    get(path) {
        const baseurl = window.location.protocol + "//" + window.location.host + "/api/v1"
        return this.http.get(baseurl + path).map((res: Response) => {
            return res.json();
        }).catch((err: HttpErrorResponse) => {
            const subject = new BehaviorSubject({ status: err.status, error: true });
            return subject.asObservable();
        });
    }

    upload(path, field, files) {
        const baseurl = window.location.protocol + "//" + window.location.host + "/api/v1"

        const formdata = new FormData();
        for (let i = 0; i < files.length; ++i) {
            formdata.append(field, files[i]);
        }

        const headers = new Headers();
        headers.set('Accept', 'application/json');

        const options = new RequestOptions({ headers: headers });
        return this.http.post(baseurl + path, formdata, options).map((res: Response) => {
            return res.json();
        }).catch((err: HttpErrorResponse) => {
            const subject = new BehaviorSubject({ status: err.status, error: true });
            return subject.asObservable();
        });
    }
}
