import React from 'react';
import { Card, CardContent } from "../utils/card";
import { ArrowUpRight, Clock, IndianRupee, Calendar, TrendingUp } from "lucide-react";

const TimeBasedStats = ({ title, value, icon: Icon, trend, timeFrame }) => {
    return (
        <Card className={`p-6 shadow-lg rounded-lg transform hover:scale-105 transition-transform duration-300 
            ${title.includes("Total Amount") ? "bg-gradient-to-r from-brand to-brand-hover text-white" : 
              title.includes("Pending Disbursal") ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white" :
              "bg-gradient-to-r from-red-500 to-pink-500 text-white"}`}>
            <CardContent className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                    <div className="text-5xl font-bold mb-4">{value}</div>
                    <div className="flex items-center justify-between">
                        <span className="text-lg">{timeFrame}</span>
                        {trend && (
                            <span className={`flex items-center ${trend > 0 ? 'text-green-300' : 'text-red-300'}`}>
                                <TrendingUp className="w-5 h-5 mr-1" />
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TimeBasedStats; 