/**
 * Created by ngerakines on 4/11/16.
 */

import * as Promise from "bluebird";
import * as Sequelize from "sequelize";
import {Logger} from "bunyan";
import * as uuid from "node-uuid";
import {hashSync} from "bcryptjs";

export interface AccountAttribute {
    id?:string;
    name?:string;
    email?:string;
    password?:string;
}

export interface AddressAttribute {
    id?:string;
    street?:string;
    city?:string;
    state?:string,
    zip?:string;
}

export interface AccountInstance extends Sequelize.Instance<AccountAttribute>, AccountAttribute {
    getAddresses: Sequelize.HasManyGetAssociationsMixin<AddressAttribute>;
    setAddresses: Sequelize.HasManySetAssociationsMixin<AddressAttribute, string>;
    addAddresses: Sequelize.HasManyAddAssociationsMixin<AddressAttribute, string>;
    addAddress: Sequelize.HasManyAddAssociationMixin<AddressAttribute, string>;
    createAddress: Sequelize.HasManyCreateAssociationMixin<AddressAttribute>;
    removeAddress: Sequelize.HasManyRemoveAssociationMixin<AddressAttribute, string>;
    removeAddresses: Sequelize.HasManyRemoveAssociationsMixin<AddressAttribute, string>;
    hasAddress: Sequelize.HasManyHasAssociationMixin<AddressAttribute, string>;
    hasAddresses: Sequelize.HasManyHasAssociationsMixin<AddressAttribute, string>;
    countAddresses: Sequelize.HasManyCountAssociationsMixin;
}

export interface AddressInstance extends Sequelize.Instance<AddressAttribute>, AddressAttribute {
    getAccount: Sequelize.BelongsToGetAssociationMixin<AccountInstance>;
    setAccount: Sequelize.BelongsToSetAssociationMixin<AccountInstance, string>;
    createAccount: Sequelize.BelongsToCreateAssociationMixin<AccountInstance>;
}

export interface AccountModel extends Sequelize.Model<AccountInstance, AccountAttribute> { }

export interface AddresstModel extends Sequelize.Model<AddressInstance, AddressAttribute> { }

export interface SequelizeStorageConfig {
    database:string;
    username:string;
    password:string
}

export interface StorageManager {
    init(force?:boolean):Promise<any>;
    register(name:string, email:string, rawPassword:string):Promise<any>;
    getAccountById(id:string):Promise<any>;
    getAccountByEmail(email:string):Promise<any>;
    addAddress(account:any, street:string, city:string, state:string, zip:string):Promise<any>;
}

export class SequelizeStorageManager implements StorageManager {
    public sequelize:Sequelize.Sequelize;
    /* tslint:disable */
    public Account:AccountModel;
    public Address:AddresstModel;

    private logger:Logger;
    private config:SequelizeStorageConfig;

    constructor(config:SequelizeStorageConfig, logger:Logger) {
        this.config = config;
        this.logger = logger.child({component: "Storage"});

        this.sequelize = new Sequelize(this.config.database, this.config.username, this.config.password, { dialect: "postgres" });
        this.Account = this.sequelize.define<AccountInstance, AccountAttribute>("Account", {
                "id": {
                    "type": Sequelize.UUID,
                    "allowNull": false,
                    "primaryKey": true
                },
                "name": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false
                },
                "email": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false,
                    "unique": true,
                    "validate": {
                        "isEmail": true
                    }
                },
                "password": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false
                }
            },
            {
                "tableName": "accounts",
                "timestamps": true,
                "createdAt": "created_at",
                "updatedAt": "updated_at",
            });
        this.Address = this.sequelize.define<AddressInstance, AddressAttribute>("Address", {
                "id": {
                    "type": Sequelize.UUID,
                    "allowNull": false,
                    "primaryKey": true
                },
                "street": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false
                },
                "city": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false
                },
                "state": {
                    "type": Sequelize.STRING(128),
                    "allowNull": false
                },
                "zip": {
                    "type": Sequelize.INTEGER,
                    "allowNull": false
                }
            },
            {
                "tableName": "addresses",
                "timestamps": true,
                "createdAt": "created_at",
                "updatedAt": "updated_at",
            });

        this.Address.belongsTo(this.Account);
        this.Account.hasMany(this.Address);
    }

    init(force?:boolean):Promise<any> {
        force = force || false;
        return this.sequelize.sync({force: force, logging: true});
    }

    register(name:string, email:string, rawPassword:string):Promise<any> {
        return this.sequelize.transaction((transaction:Sequelize.Transaction) => {
            let accountId = uuid.v4();
            return this.hashPassword(rawPassword)
                .then((password) => {
                    return this.Account
                        .create({
                            id: accountId,
                            name: name,
                            email: email,
                            password: password
                        }, {transaction: transaction})
                });
        });
    }

    getAccountById(id:string):Promise<any> {
        return this.Account.find({where: {id: id}});
    }

    getAccountByEmail(email:string):Promise<any> {
        return this.Account.find({where: {email: email}});
    }

    addAddress(account:any, street:string, city:string, state:string, zip:string):Promise<any> {
        account = <AccountInstance>account;
        return account
            .createAddress({
                id: uuid.v4(),
                street:street,
                city: city,
                state: state,
                zip: zip
            });
    }

    private hashPassword(password:string):Promise<any> {
        return new Promise((resolve) => {
            resolve(hashSync(password));
        });
    }

}
