import React, { useState, useEffect, useContext } from "react";
// import classnames from "classnames";
import styles from "./Header.module.css";
import { UserBox } from "../../components/user-box/UserBox";

export const Header = ({
    router,
}) => {
    return (
        <div className={styles.header}>
            <img
                src={"/assets/logo.svg"}
                className={styles.logo}
                alt="Webaverse Wiki"
                onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();

                    router.handleUrlUpdate(globalThis.location.protocol + '//' + globalThis.location.host);
                }}
            />
            <UserBox />
        </div>
    );
};
