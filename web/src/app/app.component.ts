import { Component } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ApiService } from './api.service';
import { StateService } from './state.service';
import { ModalService } from './modal.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    animations: [
        trigger('imageModal', [
            state('open', style({
                opacity: '1'
            })),
            state('close', style({
                opacity: '0'
            })),
            //transition('open => close', animate('200ms ease-in-out')),
            transition('close => open', animate('300ms ease-in-out'))
        ]),
    ]
})
export class AppComponent {
    title = 'Imghost';
    authenticated = true;
    authenticators: Array<string> = [];
    images = undefined;
    imageModalState: string = "close";

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.refresh();
        this.state.get("refresh").subscribe(value => {
            if (value) {
                this.refresh();
                this.state.set("refresh", false);
            }
        });
        this.state.get("modal").subscribe(value => {
            this.imageModalState = (value === "image") ? "open" : "close";
        });
    }

    refresh() {
        this.api.get("/images").subscribe(data => {
            if (data.status === 401) {
                this.authenticated = false;
                this.api.get("/auth").subscribe(data => {
                    console.log(data instanceof Array);
                    if (data instanceof Array)
                        this.authenticators = data;
                });
            } else if (data instanceof Array) {
                //console.log("data", data);
                this.images = data;
            }
        });
    }

    openModal(id: string) {
        this.modals.open(id);
    }
}
