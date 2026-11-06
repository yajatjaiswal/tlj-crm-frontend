import * as React from "react";
import { cn } from "../utils/common";

const Table = ({ className, ...props }) => (
    <table className={cn("w-full border-collapse", className)} {...props} />
);

const TableHeader = ({ className, ...props }) => (
    <thead className={cn("bg-gray-100 text-left", className)} {...props} />
);

const TableRow = ({ className, ...props }) => (
    <tr className={cn("border-b last:border-b-0", className)} {...props} />
);

const TableHead = ({ className, ...props }) => (
    <th className={cn("p-2 font-medium text-gray-700", className)} {...props} />
);

const TableBody = ({ className, ...props }) => <tbody {...props} />;
const TableCell = ({ className, ...props }) => <td className={cn("p-2", className)} {...props} />;

export { Table, TableHeader, TableRow, TableHead, TableBody, TableCell };
