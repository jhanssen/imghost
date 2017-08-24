import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { HttpErrorResponse } from '@angular/common/http';
import { AsyncSubject, BehaviorSubject } from 'rxjs/Rx';
import 'rxjs/add/operator/map';

@Injectable()
export class ApiService {
    cache: { [key: string]: AsyncSubject<any> } = {};
    baseurl: string = window.location.protocol + "//" + window.location.host + "/api/v1";

    constructor(private http: Http) { }

    get(path) {
        return this.http.get(this.baseurl + path).map((res: Response) => {
            return res.json();
        }).catch((err: HttpErrorResponse) => {
            const subject = new BehaviorSubject<any>({ status: err.status, error: true });
            return subject.asObservable();
        });
    }

    cached(path) {
        if (path in this.cache) {
            return this.cache[path].asObservable();
        } else {
            const cachedSubject = new AsyncSubject<any>();
            this.cache[path] = cachedSubject;
            this.get(path).subscribe(data => {
                cachedSubject.next(data);
                cachedSubject.complete();
            });
            return cachedSubject.asObservable();
        }
    }

    upload(path: string, fields: { [key: string]: any }) {
        const baseurl = window.location.protocol + "//" + window.location.host + "/api/v1"

        const formdata = new FormData();
        const append = (key, value) => {
            if (value instanceof Array) {
                for (let i = 0; i < value.length; ++i) {
                    formdata.append(key, value[i]);
                }
            } else {
                formdata.append(key, value);
            }
        };
        for (let k in fields) {
            append(k, fields[k]);
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
