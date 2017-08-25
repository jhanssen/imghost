import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ApiService } from '../api.service';
import { StateService } from '../state.service';
import { ModalService } from '../modal.service';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html',
    styleUrls: ['./user.component.css'],
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
export class UserComponent implements OnInit {
    title = 'Imghost';
    authenticated = true;
    authenticators: Array<string> = [];
    images = undefined;
    imageModalState: string = "close";
    id: string = undefined;
    publicId: string = "";

    constructor(private api: ApiService, private state: StateService,
                private modals: ModalService, private route: ActivatedRoute) {
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
        let path = "/images";
        if (this.id) {
            path += `/${this.id}`;
        } else {
            // we're logged in (presumably)
            this.api.cached("/user").subscribe(data => {
                if ("email" in data) {
                    //this.email = data.email;
                    this.publicId = data.publicId;
                }
            });
        }
        this.api.get(path).subscribe(data => {
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

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.id = params.id;
            this.refresh();
        });
    }
}
