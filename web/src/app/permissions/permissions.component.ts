import { Component, OnInit, Input } from '@angular/core';
import { ApiService } from '../api.service';
import { StateService } from '../state.service';
import { PermissionsService } from '../permissions.service';

@Component({
    selector: 'app-permissions',
    templateUrl: './permissions.component.html',
    styleUrls: ['./permissions.component.css']
})
export class PermissionsComponent implements OnInit {
    @Input() dep: string;

    id: string;
    permissions: any = {};
    value: number = 0;

    constructor(private api: ApiService, private state: StateService,
                private perms: PermissionsService) {
        this.api.cached("/permissions").subscribe(data => {
            this.permissions = data;
        });
        this.state.get("modal").subscribe(modal => {
            if (!this.dep && !modal) {
                this.value = 0;
                this.perms.update(0);
            }
        });
    }

    permissionKeys() {
        return Object.keys(this.permissions);
    }

    setPermission(perm) {
        if (this.id) {
            this.api.get(`/meta/set/permissions/${perm}/${this.id}`).subscribe(ok => {
                if (ok.ok) {
                    this.value = perm;
                }
            });
        } else {
            this.value = perm;
            this.perms.update(perm);
        }
    }

    ngOnInit() {
        //console.log("image", this.dep);
        if (this.dep) {
            this.state.get(this.dep).subscribe(id => {
                if (id) {
                    this.id = id;
                    this.api.get(`/meta/get/${id}`).subscribe(meta => {
                        //console.log("got meta", id, meta);
                        let permissions = 0;
                        if ("permissions" in meta)
                            permissions = meta.permissions;
                        console.log("perm?", permissions);
                        this.value = permissions;
                    });
                }
            });
        }
    }
}
